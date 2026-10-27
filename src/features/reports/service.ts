import { getPrisma } from '@/lib/db/prisma';
import { requirePermission } from '@/lib/permissions';

export interface GenerateDocReportOptions {
  projectId: string;
  scope: 'overall' | 'member';
  memberUserId?: string;
  reportType: 'weekly' | 'monthly' | 'custom';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  monthYear?: string; // e.g. "October 2026"
}

function roleLabel(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'Project Owner';
    case 'PROJECT_MANAGER':
      return 'Project Manager';
    case 'LEAD':
      return 'Team Lead';
    case 'MEMBER':
      return 'Team Member';
    case 'VIEWER':
      return 'Viewer';
    default:
      return role;
  }
}

export async function generateDocReport(userId: string, options: GenerateDocReportOptions) {
  const { projectId, scope, memberUserId, reportType, startDate, endDate, monthYear } = options;
  await requirePermission(userId, projectId, 'report.generate');

  const db = getPrisma();
  const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
  const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  // 1. Fetch project info, author info, and optional member info
  const [project, author, member] = await Promise.all([
    db.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { id: true, name: true, issuePrefix: true, description: true }
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { username: true, name: true }
    }),
    scope === 'member' && memberUserId
      ? db.projectMember.findFirst({
          where: { projectId, userId: memberUserId },
          include: { user: { select: { id: true, username: true, name: true } } }
        })
      : null
  ]);

  const targetMemberName = member?.user.name || member?.user.username || 'Member';
  const targetMemberUsername = member?.user.username || '';
  const targetMemberRole = member?.role ? roleLabel(member.role) : '';

  // 2. Fetch issues with scope filtering
  const issueWhereBase = {
    projectId,
    archivedAt: null,
    ...(scope === 'member' && memberUserId ? { assigneeId: memberUserId } : {})
  };

  const isDoneStatus = (status: string) =>
    /^(done|closed|complete|completed|resolved|shipped|released)$/i.test(status);

  const [allRelevantIssues, completedIssues] = await Promise.all([
    db.issue.findMany({
      where: issueWhereBase,
      select: {
        id: true,
        issueKey: true,
        title: true,
        status: true,
        priority: true,
        estimate: true,
        targetDate: true,
        updatedAt: true,
        completedAt: true,
        createdAt: true,
        assignee: { select: { username: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 2000
    }),
    db.issue.findMany({
      where: {
        ...issueWhereBase,
        OR: [
          { completedAt: { gte: startDateTime, lte: endDateTime } },
          {
            completedAt: null,
            status: { in: ['Done', 'DONE', 'Closed', 'Completed', 'Resolved'] },
            updatedAt: { gte: startDateTime, lte: endDateTime }
          }
        ]
      },
      select: {
        id: true,
        issueKey: true,
        title: true,
        status: true,
        estimate: true,
        completedAt: true,
        updatedAt: true,
        assignee: { select: { username: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })
  ]);

  const inProgressIssues = allRelevantIssues.filter(
    (i) => !isDoneStatus(i.status) && i.status !== 'BACKLOG'
  );
  const backlogIssues = allRelevantIssues.filter(
    (i) => !isDoneStatus(i.status) && i.status === 'BACKLOG'
  );
  const overdueIssues = allRelevantIssues.filter(
    (i) => !isDoneStatus(i.status) && i.targetDate && i.targetDate < endDateTime
  );
  const upcomingIssues = allRelevantIssues.filter(
    (i) => !isDoneStatus(i.status) && i.targetDate && i.targetDate >= startDateTime
  );

  const totalCompletedPoints = completedIssues.reduce((sum, i) => sum + (i.estimate ?? 1), 0);
  const totalTasksEvaluated = completedIssues.length + inProgressIssues.length + backlogIssues.length;
  const completionRate =
    totalTasksEvaluated > 0
      ? Math.round((completedIssues.length / totalTasksEvaluated) * 100)
      : 0;

  // 3. Determine titles, slugs, and folders
  let title = '';
  let folder = 'Reports/Weekly';
  let dateRangeLabel = `${startDate} to ${endDate}`;

  if (reportType === 'weekly') {
    folder = 'Reports/Weekly';
    title =
      scope === 'member'
        ? `Weekly Report — ${targetMemberName} (${startDate} to ${endDate})`
        : `Weekly Status Report — ${project.name} (${startDate} to ${endDate})`;
  } else if (reportType === 'monthly') {
    folder = 'Reports/Monthly';
    const monthLabel = monthYear || `${startDate.slice(0, 7)}`;
    dateRangeLabel = monthLabel;
    title =
      scope === 'member'
        ? `Monthly Report — ${targetMemberName} (${monthLabel})`
        : `Monthly Delivery Report — ${project.name} (${monthLabel})`;
  } else {
    folder = 'Reports/Custom';
    title =
      scope === 'member'
        ? `Custom Status Report — ${targetMemberName} (${startDate} to ${endDate})`
        : `Custom Status Report — ${project.name} (${startDate} to ${endDate})`;
  }

  const scopeSlug = scope === 'member' ? targetMemberUsername || 'member' : 'overall';
  const slug = `${reportType}-${scopeSlug}-${startDate}-to-${endDate}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');

  // 4. Construct Markdown Body
  const markdown = `# ${title}

| Attribute | Details |
| :--- | :--- |
| **Project** | ${project.name} |
| **Report Scope** | ${scope === 'member' ? `${targetMemberName} (@${targetMemberUsername}) — ${targetMemberRole}` : 'Overall Project (All Members)'} |
| **Period** | ${dateRangeLabel} (${reportType.toUpperCase()}) |
| **Generated Date** | ${dateStr} |
| **Generated By** | ${author?.name || author?.username || 'System'} |

---

## 1. Executive Summary & Delivery Metrics

* **Tasks Completed in Period:** **${completedIssues.length}** tasks (${totalCompletedPoints} estimate points)
* **Active In-Progress Work:** **${inProgressIssues.length}** tasks
* **Backlog / Queued Tasks:** **${backlogIssues.length}** tasks
* **Overdue Deliveries:** **${overdueIssues.length}** tasks
* **Delivery Completion Rate:** **${completionRate}%**

---

## 2. Accomplished & Shipped (${completedIssues.length})
${
  completedIssues.length > 0
    ? completedIssues
        .map(
          (i) =>
            `- [x] **${i.issueKey}**: ${i.title} *(${i.estimate ?? 1} pts)* — completed ${
              (i.completedAt || i.updatedAt).toISOString().slice(0, 10)
            }${scope === 'overall' && i.assignee ? ` · _@${i.assignee.username}_` : ''}`
        )
        .join('\n')
    : '_No tasks were marked completed during this period._'
}

---

## 3. Work Currently In Progress (${inProgressIssues.length})
${
  inProgressIssues.length > 0
    ? inProgressIssues
        .map(
          (i) =>
            `- [ ] **${i.issueKey}** \`[${i.status}]\`: ${i.title}${
              scope === 'overall' && i.assignee ? ` · _@${i.assignee.username}_` : ''
            }${i.priority ? ` · Priority: **${i.priority}**` : ''}`
        )
        .join('\n')
    : '_No active tasks in flight at this moment._'
}

---

## 4. Upcoming Deadlines & Commitments (${upcomingIssues.length})
${
  upcomingIssues.length > 0
    ? upcomingIssues
        .map(
          (i) =>
            `- **${i.issueKey}**: ${i.title} — **Due: ${i.targetDate?.toISOString().slice(0, 10)}** \`[${i.status}]\``
        )
        .join('\n')
    : '_No deadlines scheduled in or following this period._'
}

${
  overdueIssues.length > 0
    ? `---

## 5. Overdue Items Needing Attention (${overdueIssues.length})
${overdueIssues
  .map(
    (i) =>
      `- ⚠️ **${i.issueKey}**: ${i.title} — **Target date was ${i.targetDate?.toISOString().slice(0, 10)}** \`[${i.status}]\``
  )
  .join('\n')}
`
    : ''
}
`;

  // 5. Save directly into Project Docs via upsert
  const doc = await db.docPage.upsert({
    where: { projectId_slug: { projectId, slug } },
    create: {
      projectId,
      slug,
      title,
      body: markdown,
      folder,
      createdById: userId
    },
    update: {
      title,
      body: markdown,
      folder
    }
  });

  return { docId: doc.id, slug: doc.slug, title: doc.title };
}

/** Legacy wrapper kept for backward compatibility */
export async function generateWeeklyStatusReport(userId: string, projectId: string) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return generateDocReport(userId, {
    projectId,
    scope: 'overall',
    reportType: 'weekly',
    startDate: sevenDaysAgo,
    endDate: dateStr
  });
}

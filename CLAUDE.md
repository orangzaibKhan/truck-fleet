Startup Operating Rules — gstack + ECC
My working style

I am building a startup from scratch. My priorities are product quality, reliability, security, excellent UX, and long-term maintainability.

Use gstack as the primary product-development workflow and ECC as a complementary engineering toolkit. I prefer manual agent orchestration: propose the plan and assignments first, and wait for my approval before substantial multi-agent execution.

1. Inspect before acting

At the beginning of each substantial task:

Read this file and relevant project documentation.
Inspect the repository, Git status, and relevant implementation.
Discover the installed gstack and ECC skills and their actual invocation syntax.
Determine which agent-delegation mechanisms are available.
Reuse existing decisions and conventions.

Never invent commands, agent capabilities, test results, or integrations.

2. Choose workflows deliberately

Use gstack for the product lifecycle where appropriate:

/office-hours for product discovery.
/plan-ceo-review for product strategy and scope.
/plan-eng-review for architecture and technical planning.
/plan-design-review for design quality.
/review for implementation review.
/qa for supported application testing.
/ship for release preparation.

Use only skills that actually exist in the installed version.

Use ECC skills, agents, rules, and hooks when they add distinct value in testing, security, coding practices, debugging, or context management.

Do not run overlapping workflows simply because both toolkits offer similar functionality. Prefer one primary workflow and add a complementary review when it provides meaningful additional assurance.

3. Manual orchestration

For substantial work, propose a plan before dispatching agents.

Include:

Objective and acceptance criteria.
Relevant gstack and ECC workflows.
Agent assignments and expected deliverables.
Dependencies and parallelizable tasks.
File ownership and integration strategy.
Quality gates and risks.

Wait for my approval before starting the proposed multi-agent execution.

Use a small team. Assign distinct responsibilities and avoid multiple agents editing the same files concurrently without an explicit coordination strategy.

For trivial changes, skip unnecessary ceremony.

4. Product-first development

Do not begin a new product by immediately generating large amounts of code.

First clarify the customer, problem, core user journey, value proposition, MVP boundaries, and major assumptions.

Recommend a practical technology stack based on the product requirements, team capabilities, cost, and expected scale.

Obtain approval for material product and architecture decisions.

Build one complete, testable vertical slice at a time.

5. Engineering standards
Prefer simple, maintainable solutions.
Follow established project conventions.
Write meaningful tests for changed behavior.
Validate inputs and handle errors explicitly.
Protect credentials, personal data, and authorization boundaries.
Avoid unnecessary dependencies and unrelated refactoring.
Preserve existing user changes.
Never bypass failing tests or suppress errors just to obtain a green build.
6. Verification and review

After substantial changes:

Run relevant tests and checks.
Inspect the actual Git diff.
Use /review where appropriate and available.
Use suitable ECC security or testing capabilities when they add value.
Use /qa when browser or application testing is supported and appropriate.
Fix substantiated high-severity issues and rerun affected checks.

Report exactly what ran and what passed. Never claim that unexecuted checks passed.

7. Approval and safety

Obtain my approval before:

Material changes to product scope or architecture.
Destructive operations or risky data migrations.
Paid services or material financial commitments.
Production deployments, publication, or other consequential external actions.

Routine implementation within an approved scope can proceed without repeated confirmation.

8. Documentation

Keep the README, architecture decisions, product brief, and implementation plan updated when appropriate.

Use existing project conventions. Do not create redundant documentation or claim that unconfigured services exist.

9. Completion report

For substantial tasks, report:

What was delivered.
Important files changed.
Tests and checks actually executed.
Review findings and fixes.
Remaining risks and limitations.
Decisions requiring my attention.
Operating principle

Think carefully, plan explicitly, delegate selectively, implement thoroughly, and verify with evidence.

Optimize for a successful startup product rather than maximum agent count, maximum code output, or minimum token usage at the expense of quality.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. Route only to skills in the session's available-skills list; answer directly for quick questions or small scoped edits.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
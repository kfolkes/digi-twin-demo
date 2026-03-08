/**
 * SDLC Tools — GitHub-integrated lifecycle management for Digital Twin definitions.
 *
 * These tools let the agent commit DTDL models and twin definitions to a GitHub repo,
 * open PRs for review, check CI pipeline status, audit change history, and create
 * releases for production deployment.
 *
 * Because the Copilot SDK already authenticates via GITHUB_TOKEN, the same token
 * provides full GitHub API access — no additional auth configuration needed.
 *
 * Microsoft Learn reference (gap this fills):
 *   - MS docs cover model authoring + upload via SDK/CLI
 *   - NO official guidance exists for version control, PR review, CI/CD, or
 *     multi-environment promotion of digital twin definitions
 *   - This tooling implements that missing SDLC layer
 */

import type { Tool } from "@github/copilot-sdk";

// Re-use the same event emitter pattern as digitalTwinTools
type ToolEventListener = (event: {
  name: string;
  status: string;
  result?: unknown;
  error?: string;
}) => void;
let toolEventListener: ToolEventListener | null = null;

export function setSdlcToolEventListener(
  listener: ToolEventListener | null
): void {
  toolEventListener = listener;
}

function emit(
  name: string,
  status: string,
  result?: unknown,
  error?: string
): void {
  toolEventListener?.({ name, status, result, error });
}

// ─── Config ───────────────────────────────────────────────────────────────────

const GITHUB_API = "https://api.github.com";

function repoOwner(): string {
  return process.env.GITHUB_REPO_OWNER || "";
}

function repoName(): string {
  return process.env.GITHUB_REPO_NAME || "";
}

function defaultBranch(): string {
  return process.env.GITHUB_DEFAULT_BRANCH || "main";
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function repoConfigured(): boolean {
  return !!(repoOwner() && repoName() && process.env.GITHUB_TOKEN);
}

function repoSlug(): string {
  return `${repoOwner()}/${repoName()}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getBaseSha(): Promise<string> {
  const res = await fetch(
    `${GITHUB_API}/repos/${repoSlug()}/git/ref/heads/${defaultBranch()}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Cannot find branch '${defaultBranch()}' on ${repoSlug()}`);
  const data = (await res.json()) as { object: { sha: string } };
  return data.object.sha;
}

async function ensureBranch(branchName: string, baseSha: string): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${repoSlug()}/git/refs`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    }
  );
  // 422 = branch already exists — that's fine
  if (!res.ok && res.status !== 422) {
    const err = await res.text();
    throw new Error(`Failed to create branch '${branchName}': ${err}`);
  }
}

async function commitFile(
  filePath: string,
  content: string,
  message: string,
  branchName: string
): Promise<{ sha: string; url: string }> {
  // Check if file already exists on this branch
  const existingRes = await fetch(
    `${GITHUB_API}/repos/${repoSlug()}/contents/${filePath}?ref=${branchName}`,
    { headers: headers() }
  );
  const existingData = existingRes.ok
    ? ((await existingRes.json()) as { sha: string })
    : null;

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch: branchName,
  };
  if (existingData?.sha) body.sha = existingData.sha;

  const commitRes = await fetch(
    `${GITHUB_API}/repos/${repoSlug()}/contents/${filePath}`,
    { method: "PUT", headers: headers(), body: JSON.stringify(body) }
  );
  if (!commitRes.ok) {
    const err = await commitRes.text();
    throw new Error(`Failed to commit ${filePath}: ${err}`);
  }
  const data = (await commitRes.json()) as {
    commit: { sha: string; html_url: string };
  };
  return { sha: data.commit.sha, url: data.commit.html_url };
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export const sdlcTools: Tool<any>[] = [
  // ── 1. Commit model to repo ──
  {
    name: "commit_model_to_repo",
    description:
      "Save a DTDL model definition to the digital twin Git repository. " +
      "Creates or updates a model JSON file in the models/ directory on a new branch. " +
      "Use this after creating a model in ADT to ensure it's version-controlled.",
    parameters: {
      type: "object",
      properties: {
        modelId: {
          type: "string",
          description: "The DTDL model ID (e.g. 'dtmi:factory:TemperatureSensor;1')",
        },
        modelJson: {
          type: "string",
          description: "The full DTDL model JSON as a string",
        },
        commitMessage: {
          type: "string",
          description: "Git commit message (e.g. 'Add humidity sensor model')",
        },
        branchName: {
          type: "string",
          description: "Branch name for this change (e.g. 'add-humidity-sensor')",
        },
      },
      required: ["modelId", "modelJson", "commitMessage", "branchName"],
    },
    handler: async (args: {
      modelId: string;
      modelJson: string;
      commitMessage: string;
      branchName: string;
    }) => {
      emit("commit_model_to_repo", "executing");
      if (!repoConfigured()) {
        const msg =
          "GitHub repo not configured. Set GITHUB_REPO_OWNER and GITHUB_REPO_NAME env vars.";
        emit("commit_model_to_repo", "error", undefined, msg);
        return {
          error: msg,
          hint: "Example: GITHUB_REPO_OWNER=myorg GITHUB_REPO_NAME=factory-digital-twin",
        };
      }
      try {
        const modelName = args.modelId.split(":").slice(-1)[0].replace(/;.*$/, "");
        const filePath = `models/${modelName}.json`;
        const formatted = JSON.stringify(JSON.parse(args.modelJson), null, 2);

        const baseSha = await getBaseSha();
        await ensureBranch(args.branchName, baseSha);
        const commit = await commitFile(filePath, formatted, args.commitMessage, args.branchName);

        const result = {
          success: true,
          file: filePath,
          branch: args.branchName,
          repo: repoSlug(),
          commitSha: commit.sha.substring(0, 7),
          commitUrl: commit.url,
          message: `Model '${modelName}' committed to ${repoSlug()} on branch '${args.branchName}'.`,
          nextStep: "Open a pull request to get this reviewed before merging to main.",
        };
        emit("commit_model_to_repo", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit("commit_model_to_repo", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  // ── 2. Commit twin instances to repo ──
  {
    name: "commit_twins_to_repo",
    description:
      "Save twin instance definitions (twins + relationships) as JSON to the Git repository. " +
      "Captures the current twin graph state as code in the twins/ directory.",
    parameters: {
      type: "object",
      properties: {
        fileName: {
          type: "string",
          description: "Filename for the definition (e.g. 'bottling-line.json')",
        },
        twinsJson: {
          type: "string",
          description: "JSON containing twins and relationships to save",
        },
        commitMessage: {
          type: "string",
          description: "Git commit message",
        },
        branchName: {
          type: "string",
          description: "Branch name for this change",
        },
      },
      required: ["fileName", "twinsJson", "commitMessage", "branchName"],
    },
    handler: async (args: {
      fileName: string;
      twinsJson: string;
      commitMessage: string;
      branchName: string;
    }) => {
      emit("commit_twins_to_repo", "executing");
      if (!repoConfigured()) {
        const msg = "GitHub repo not configured. Set GITHUB_REPO_OWNER and GITHUB_REPO_NAME.";
        emit("commit_twins_to_repo", "error", undefined, msg);
        return { error: msg };
      }
      try {
        const filePath = `twins/${args.fileName}`;
        const formatted = JSON.stringify(JSON.parse(args.twinsJson), null, 2);

        const baseSha = await getBaseSha();
        await ensureBranch(args.branchName, baseSha);
        const commit = await commitFile(filePath, formatted, args.commitMessage, args.branchName);

        const result = {
          success: true,
          file: filePath,
          branch: args.branchName,
          repo: repoSlug(),
          commitSha: commit.sha.substring(0, 7),
          commitUrl: commit.url,
        };
        emit("commit_twins_to_repo", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit("commit_twins_to_repo", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  // ── 3. Open a Pull Request ──
  {
    name: "open_pull_request",
    description:
      "Open a GitHub Pull Request to review digital twin changes before deploying to production. " +
      "Creates a PR from the working branch to the default branch with a summary of changes.",
    parameters: {
      type: "object",
      properties: {
        branchName: {
          type: "string",
          description: "Source branch with the changes",
        },
        title: {
          type: "string",
          description: "PR title (e.g. 'Add humidity sensors to floor 1')",
        },
        body: {
          type: "string",
          description: "PR description with summary of twin changes",
        },
      },
      required: ["branchName", "title", "body"],
    },
    handler: async (args: { branchName: string; title: string; body: string }) => {
      emit("open_pull_request", "executing");
      if (!repoConfigured()) {
        const msg = "GitHub repo not configured.";
        emit("open_pull_request", "error", undefined, msg);
        return { error: msg };
      }
      try {
        const prRes = await fetch(
          `${GITHUB_API}/repos/${repoSlug()}/pulls`,
          {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({
              title: args.title,
              body: args.body,
              head: args.branchName,
              base: defaultBranch(),
            }),
          }
        );
        if (!prRes.ok) {
          const err = await prRes.text();
          throw new Error(`Failed to create PR: ${err}`);
        }
        const prData = (await prRes.json()) as {
          number: number;
          html_url: string;
          state: string;
        };
        const result = {
          success: true,
          prNumber: prData.number,
          prUrl: prData.html_url,
          state: prData.state,
          message: `PR #${prData.number} opened: ${prData.html_url}`,
          nextStep:
            "The validate-dtdl CI pipeline will run automatically. When checks pass and the PR is approved, merge to deploy to dev.",
        };
        emit("open_pull_request", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit("open_pull_request", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  // ── 4. Check CI pipeline status ──
  {
    name: "check_pipeline_status",
    description:
      "Check the status of GitHub Actions CI/CD pipelines for a branch or PR. " +
      "Shows whether DTDL validation, tests, and deployment checks have passed.",
    parameters: {
      type: "object",
      properties: {
        branchName: {
          type: "string",
          description: "Branch to check pipeline status for",
        },
      },
      required: ["branchName"],
    },
    handler: async (args: { branchName: string }) => {
      emit("check_pipeline_status", "executing");
      if (!repoConfigured()) {
        const msg = "GitHub repo not configured.";
        emit("check_pipeline_status", "error", undefined, msg);
        return { error: msg };
      }
      try {
        const runsRes = await fetch(
          `${GITHUB_API}/repos/${repoSlug()}/actions/runs?branch=${encodeURIComponent(args.branchName)}&per_page=5`,
          { headers: headers() }
        );
        if (!runsRes.ok) throw new Error("Could not fetch workflow runs");

        const runsData = (await runsRes.json()) as {
          total_count: number;
          workflow_runs: Array<{
            id: number;
            name: string;
            status: string;
            conclusion: string | null;
            html_url: string;
            created_at: string;
          }>;
        };

        if (runsData.total_count === 0) {
          const result = {
            success: true,
            runs: [],
            message: `No workflow runs found for branch '${args.branchName}'.`,
            hint: "CI pipelines trigger on push/PR. Ensure .github/workflows/ is set up in the repo.",
          };
          emit("check_pipeline_status", "completed", result);
          return result;
        }

        const runs = runsData.workflow_runs.map((r) => ({
          name: r.name,
          status: r.status,
          conclusion: r.conclusion,
          url: r.html_url,
          created: r.created_at,
        }));
        const result = { success: true, runs };
        emit("check_pipeline_status", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit("check_pipeline_status", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  // ── 5. List recent changes (audit trail) ──
  {
    name: "list_twin_changes",
    description:
      "Show recent Git commits that changed digital twin models or twin definitions. " +
      "Provides an audit trail of who changed what and when.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Directory to check — 'models', 'twins', or both. Defaults to 'models'.",
        },
        count: {
          type: "number",
          description: "Number of recent commits to show (default: 10, max: 30)",
        },
      },
      required: [],
    },
    handler: async (args: { path?: string; count?: number }) => {
      emit("list_twin_changes", "executing");
      if (!repoConfigured()) {
        const msg = "GitHub repo not configured.";
        emit("list_twin_changes", "error", undefined, msg);
        return { error: msg };
      }
      try {
        const path = args.path || "models";
        const count = Math.min(args.count || 10, 30);

        const commitsRes = await fetch(
          `${GITHUB_API}/repos/${repoSlug()}/commits?path=${encodeURIComponent(path)}&per_page=${count}`,
          { headers: headers() }
        );
        if (!commitsRes.ok) throw new Error("Could not fetch commit history");

        const commits = (await commitsRes.json()) as Array<{
          sha: string;
          commit: { message: string; author: { name: string; date: string } };
          html_url: string;
        }>;

        if (commits.length === 0) {
          const result = {
            success: true,
            commits: [],
            message: `No commits found in '${path}/'. Models may not be committed yet.`,
          };
          emit("list_twin_changes", "completed", result);
          return result;
        }

        const result = {
          success: true,
          commits: commits.map((c) => ({
            sha: c.sha.substring(0, 7),
            message: c.commit.message,
            author: c.commit.author.name,
            date: c.commit.author.date,
            url: c.html_url,
          })),
        };
        emit("list_twin_changes", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit("list_twin_changes", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  // ── 6. Create a release for production deployment ──
  {
    name: "create_release",
    description:
      "Create a GitHub Release to mark a version of the digital twin configuration for production. " +
      "This tags the current state and can trigger a deploy-to-production workflow via GitHub Actions.",
    parameters: {
      type: "object",
      properties: {
        version: {
          type: "string",
          description: "Semantic version tag (e.g. 'v1.0.0', 'v1.2.0')",
        },
        name: {
          type: "string",
          description:
            "Release name (e.g. 'Bottling Line v1.2 — Added humidity sensors')",
        },
        notes: {
          type: "string",
          description: "Release notes describing what changed",
        },
      },
      required: ["version", "name", "notes"],
    },
    handler: async (args: { version: string; name: string; notes: string }) => {
      emit("create_release", "executing");
      if (!repoConfigured()) {
        const msg = "GitHub repo not configured.";
        emit("create_release", "error", undefined, msg);
        return { error: msg };
      }
      try {
        const releaseRes = await fetch(
          `${GITHUB_API}/repos/${repoSlug()}/releases`,
          {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({
              tag_name: args.version,
              name: args.name,
              body: args.notes,
              draft: false,
              prerelease: false,
            }),
          }
        );
        if (!releaseRes.ok) {
          const err = await releaseRes.text();
          throw new Error(`Failed to create release: ${err}`);
        }
        const data = (await releaseRes.json()) as {
          id: number;
          html_url: string;
          tag_name: string;
        };
        const result = {
          success: true,
          releaseUrl: data.html_url,
          tag: data.tag_name,
          message: `Release ${data.tag_name} created: ${data.html_url}`,
          nextStep:
            "If deploy-prod.yml is configured, production deployment triggers automatically on release publish.",
        };
        emit("create_release", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit("create_release", "error", undefined, msg);
        return { error: msg };
      }
    },
  },
];

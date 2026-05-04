import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.GITHUB_REPO_OWNER!;
const repo = process.env.GITHUB_REPO_NAME!;
const branch = process.env.GITHUB_REPO_BRANCH || "main";

export async function readFile(path: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if ("content" in data && data.type === "file") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err && err.status === 404) {
      return null;
    }
    throw err;
  }
}

async function getFileSha(path: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if ("sha" in data) {
      return data.sha;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeFile(
  path: string,
  content: string,
  message: string
): Promise<void> {
  const sha = await getFileSha(path);
  const encoded = Buffer.from(content).toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: encoded,
    branch,
    ...(sha ? { sha } : {}),
  });
}

export async function listFiles(dir: string): Promise<string[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: dir,
      ref: branch,
    });

    if (Array.isArray(data)) {
      return data.map((item) => item.path);
    }
    return [];
  } catch {
    return [];
  }
}

export async function uploadFile(
  path: string,
  buffer: Buffer,
  message: string
): Promise<void> {
  const sha = await getFileSha(path);
  const encoded = buffer.toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: encoded,
    branch,
    ...(sha ? { sha } : {}),
  });
}

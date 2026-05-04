import { Octokit } from "@octokit/rest";
import type { RepoRef } from "@/types/manifest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function readFile(repo: RepoRef, path: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: repo.owner,
      repo: repo.name,
      path,
      ref: repo.branch,
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

async function getFileSha(repo: RepoRef, path: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: repo.owner,
      repo: repo.name,
      path,
      ref: repo.branch,
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
  repo: RepoRef,
  path: string,
  content: string,
  message: string
): Promise<void> {
  const sha = await getFileSha(repo, path);
  const encoded = Buffer.from(content).toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    owner: repo.owner,
    repo: repo.name,
    path,
    message,
    content: encoded,
    branch: repo.branch,
    ...(sha ? { sha } : {}),
  });
}

export async function listFiles(repo: RepoRef, dir: string): Promise<string[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: repo.owner,
      repo: repo.name,
      path: dir,
      ref: repo.branch,
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
  repo: RepoRef,
  path: string,
  buffer: Buffer,
  message: string
): Promise<void> {
  const sha = await getFileSha(repo, path);
  const encoded = buffer.toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    owner: repo.owner,
    repo: repo.name,
    path,
    message,
    content: encoded,
    branch: repo.branch,
    ...(sha ? { sha } : {}),
  });
}

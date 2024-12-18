import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";

const ACCEPTANCE_TEST_PROJECT_KEY = "acceptance_test_project";
const ACCEPTANCE_TEST_GHERKIN_KEY = "acceptance_test_gherkin";
const ACCEPTANCE_TEST_STATUS_KEY = "acceptance_test_status";
const ACCEPTANCE_TEST_SEARCH_KEY = "acceptance_test_search";

const FIELD_STATUS = {
  TODO: 0,
  PASSED: 1,
  FAILED: 2,
  SKIPPED: 3,
};

const getProjectProperty = async (projectId) => {
  if (!projectId) {
    return {};
  }
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/project/${projectId}/properties/${ACCEPTANCE_TEST_PROJECT_KEY}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
  if (response.status !== 200) {
    return {};
  }
  return (await response.json())["value"];
};

const setProjectProperty = async (
  workspaceForBitBucket,
  repoForBitBucket,
  accessTokenForBitBucket,
  ownerForGitHub,
  repoForGitHub,
  accessTokenForGitHub,
  projectId
) => {
  const body = {
    workspaceForBitBucket: workspaceForBitBucket ?? "",
    repoForBitBucket: repoForBitBucket ?? "",
    accessTokenForBitBucket: accessTokenForBitBucket ?? "",
    ownerForGitHub: ownerForGitHub ?? "",
    repoForGitHub: repoForGitHub ?? "",
    accessTokenForGitHub: accessTokenForGitHub ?? "",
  };
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/project/${projectId}/properties/${ACCEPTANCE_TEST_PROJECT_KEY}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
  if (response.status !== 200 && response.status !== 201) {
    return false;
  }
  return true;
};

const sumUpStatuses = (statuses) => {
  const sum = {
    todo: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  statuses.forEach((status) => {
    let index = 0;
    while (status[`scenario_${index}`] !== undefined) {
      if (status[`scenario_${index}`] === FIELD_STATUS.TODO) {
        sum.todo++;
      } else if (status[`scenario_${index}`] === FIELD_STATUS.PASSED) {
        sum.passed++;
      } else if (status[`scenario_${index}`] === FIELD_STATUS.FAILED) {
        sum.failed++;
      } else if (status[`scenario_${index}`] === FIELD_STATUS.SKIPPED) {
        sum.skipped++;
      }
      index++;
    }
  });
  return sum;
};

const getIssueProperty = async (projectId, issueId) => {
  if (!issueId) {
    return {};
  }
  const gherkinResponse = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_GHERKIN_KEY}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
  const gherkins =
    gherkinResponse.status === 200
      ? (await gherkinResponse.json())["value"]
      : undefined;
  const statusResponse = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_STATUS_KEY}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

  let bitBucketAvailable = false;
  let gitHubAvailable = false;
  try {
    const {
      workspaceForBitBucket,
      repoForBitBucket,
      accessTokenForBitBucket,
      ownerForGitHub,
      repoForGitHub,
      accessTokenForGitHub,
    } = await getProjectProperty(projectId);
    bitBucketAvailable =
      workspaceForBitBucket && repoForBitBucket && accessTokenForBitBucket;
    gitHubAvailable = ownerForGitHub && repoForGitHub && accessTokenForGitHub;
  } catch (e) {}

  const statuses =
    statusResponse.status === 200
      ? (await statusResponse.json())["value"]
      : undefined;
  return {
    gherkins: gherkins ? (Array.isArray(gherkins) ? gherkins : [gherkins]) : [],
    statuses: statuses ? (Array.isArray(statuses) ? statuses : [statuses]) : [],
    bitBucketAvailable: bitBucketAvailable,
    gitHubAvailable: gitHubAvailable,
  };
};

const initIssueProperty = async (gherkins, statuses, issueId) => {
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_GHERKIN_KEY}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gherkins),
      }
    );
  if (response.status !== 200 && response.status !== 201) {
    return false;
  }
  try {
    await api
      .asUser()
      .requestJira(
        route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_STATUS_KEY}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(statuses),
        }
      );
  } catch (e) {}
  try {
    const entity = sumUpStatuses(statuses);
    entity["title"] = statuses.map((status) => status.title ?? "").join(" | ");
    await api
      .asUser()
      .requestJira(
        route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_SEARCH_KEY}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entity),
        }
      );
  } catch (e) {}
  return true;
};

const updateIssueProperty = async (statuses, issueId) => {
  try {
    await api
      .asUser()
      .requestJira(
        route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_STATUS_KEY}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(statuses),
        }
      );
  } catch (e) {}
  try {
    const entity = sumUpStatuses(statuses);
    entity["title"] = statuses.map((status) => status.title ?? "").join(" | ");
    await api
      .asUser()
      .requestJira(
        route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_SEARCH_KEY}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entity),
        }
      );
  } catch (e) {}
  return true;
};

const clearIssueProperty = async (issueId) => {
  try {
    await api
      .asUser()
      .requestJira(
        route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_GHERKIN_KEY}`,
        {
          method: "DELETE",
        }
      );
  } catch (e) {}
  try {
    await api
      .asUser()
      .requestJira(
        route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_STATUS_KEY}`,
        {
          method: "DELETE",
        }
      );
  } catch (e) {}
  try {
    await api
      .asUser()
      .requestJira(
        route`/rest/api/3/issue/${issueId}/properties/${ACCEPTANCE_TEST_SEARCH_KEY}`,
        {
          method: "DELETE",
        }
      );
  } catch (e) {}
  return true;
};

const getGherkinTextFromBitBucket = async (projectId, issueKey) => {
  try {
    const fileName = `${issueKey}.feature`;
    const { workspaceForBitBucket, repoForBitBucket, accessTokenForBitBucket } =
      await getProjectProperty(projectId);
    const workspace = workspaceForBitBucket;
    const repo = repoForBitBucket;
    const authorization = `Bearer ${accessTokenForBitBucket}`;
    const repoResponse = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}`,
      {
        headers: {
          Authorization: authorization,
        },
      }
    );
    const defaultBranch = (await repoResponse.json()).mainbranch.name;
    const commitResponse = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/commits?branch=${defaultBranch}`,
      {
        params: {
          pagelen: 1,
        },
        headers: {
          Authorization: authorization,
        },
      }
    );
    const latestCommit = (await commitResponse.json()).values[0].hash;
    const fileListResponse = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/src/${latestCommit}/?max_depth=10&q=path+%7E+%22${fileName}%22`,
      {
        headers: {
          Authorization: authorization,
        },
      }
    );
    const path = (await fileListResponse.json()).values[0].path;
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/src/${latestCommit}/${path}`,
      {
        headers: {
          Authorization: authorization,
        },
      }
    );
    const text = Buffer.from(await response.arrayBuffer(), "base64").toString();
    return {
      value: text,
    };
  } catch (e) {
    return {};
  }
};

const getGherkinTextFromGitHub = async (projectId, issueKey) => {
  try {
    const { ownerForGitHub, repoForGitHub, accessTokenForGitHub } =
      await getProjectProperty(projectId);
    const owner = ownerForGitHub;
    const repo = repoForGitHub;
    const authorization = `Bearer ${accessTokenForGitHub}`;

    const fileListResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
      {
        headers: {
          Authorization: authorization,
        },
      }
    );
    const path = (await fileListResponse.json()).tree.find((x) => {
      const n = x.path.split("/").pop();
      return (
        n.includes(issueKey) &&
        n.endsWith(".feature") &&
        isNaN(n.at(n.indexOf(issueKey) + issueKey.length))
      );
    }).path;
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: authorization,
        },
      }
    );
    const text = Buffer.from(
      (await response.json()).content,
      "base64"
    ).toString();
    return {
      value: text,
    };
  } catch (e) {
    return {};
  }
};

const resolver = new Resolver();

resolver.define("getProjectProperty", async (req) => {
  const { projectId } = req.payload;
  return await getProjectProperty(projectId);
});

resolver.define("setProjectProperty", async (req) => {
  const {
    workspaceForBitBucket,
    repoForBitBucket,
    accessTokenForBitBucket,
    ownerForGitHub,
    repoForGitHub,
    accessTokenForGitHub,
    projectId,
  } = req.payload;
  return await setProjectProperty(
    workspaceForBitBucket,
    repoForBitBucket,
    accessTokenForBitBucket,
    ownerForGitHub,
    repoForGitHub,
    accessTokenForGitHub,
    projectId
  );
});

resolver.define("getIssueProperty", async (req) => {
  const { projectId, issueId } = req.payload;
  return await getIssueProperty(projectId, issueId);
});

resolver.define("initIssueProperty", async (req) => {
  const { gherkins, statuses, issueId } = req.payload;
  return await initIssueProperty(gherkins, statuses, issueId);
});

resolver.define("updateIssueProperty", async (req) => {
  const { statuses, issueId } = req.payload;
  return await updateIssueProperty(statuses, issueId);
});

resolver.define("clearIssueProperty", async (req) => {
  const { issueId } = req.payload;
  return await clearIssueProperty(issueId);
});

resolver.define("getGherkinTextFromBitBucket", async (req) => {
  const { projectId, issueKey } = req.payload;
  return await getGherkinTextFromBitBucket(projectId, issueKey);
});

resolver.define("getGherkinTextFromGitHub", async (req) => {
  const { projectId, issueKey } = req.payload;
  return await getGherkinTextFromGitHub(projectId, issueKey);
});

export const handler = resolver.getDefinitions();

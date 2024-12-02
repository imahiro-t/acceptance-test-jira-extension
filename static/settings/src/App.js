import React, { useEffect, useState } from "react";

import { Box, Inline, Stack, Text, xcss } from "@atlaskit/primitives";
import Button from "@atlaskit/button/new";
import SVG from "@atlaskit/icon/svg";
import SectionMessage from "@atlaskit/section-message";
import { useThemeObserver } from "@atlaskit/tokens";
import { invoke, view } from "@forge/bridge";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";

const App = () => {
  const [context, setContext] = useState();
  const theme = useThemeObserver();
  useEffect(async () => {
    await view.theme.enable();
  }, []);
  useEffect(() => {
    view.getContext().then(setContext);
  }, []);
  if (!context) {
    return " ";
  }

  const currentTheme = (theme) =>
    createTheme({
      palette: {
        mode: theme,
      },
    });

  const {
    extension: { project },
  } = context;
  return (
    <ThemeProvider theme={currentTheme(theme.colorMode)}>
      <View project={project} />
    </ThemeProvider>
  );
};

const View = ({ project }) => {
  const [workspaceForBitBucket, setWorkspaceForBitBucket] = useState();
  const [repoForBitBucket, setRepoForBitBucket] = useState();
  const [accessTokenForBitBucket, setAccessTokenForBitBucket] = useState();
  const [ownerForGitHub, setOwnerForGitHub] = useState();
  const [repoForGitHub, setRepoForGitHub] = useState();
  const [accessTokenForGitHub, setAccessTokenForGitHub] = useState();

  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const [isSaveFailed, setIsSaveFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setIsLoadFailed(false);
    invoke("getProjectProperty", { projectId: project.id })
      .then((settings) => {
        setWorkspaceForBitBucket(settings["workspaceForBitBucket"]);
        setRepoForBitBucket(settings["repoForBitBucket"]);
        setAccessTokenForBitBucket(settings["accessTokenForBitBucket"]);
        setOwnerForGitHub(settings["ownerForGitHub"]);
        setRepoForGitHub(settings["repoForGitHub"]);
        setAccessTokenForGitHub(settings["accessTokenForGitHub"]);
      })
      .catch((e) => {
        setIsLoadFailed(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const saveConfiguration = (event) => {
    setIsSaving(true);
    setIsSaveFailed(false);
    invoke("setProjectProperty", {
      workspaceForBitBucket: workspaceForBitBucket,
      repoForBitBucket: repoForBitBucket,
      accessTokenForBitBucket: accessTokenForBitBucket,
      ownerForGitHub: ownerForGitHub,
      repoForGitHub: repoForGitHub,
      accessTokenForGitHub: accessTokenForGitHub,
      projectId: project.id,
    })
      .then((data) => {
        setIsSaveFailed(!data);
      })
      .catch((e) => {
        setIsSaveFailed(true);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleWorkspaceForBitBucketChange = (data) => {
    setWorkspaceForBitBucket(data.target.value);
  };

  const handleRepoForBitBucketChange = (data) => {
    setRepoForBitBucket(data.target.value);
  };

  const handleAccessTokenForBitBucketChange = (data) => {
    setAccessTokenForBitBucket(data.target.value);
  };

  const handleOwnerForGitHubChange = (data) => {
    setOwnerForGitHub(data.target.value);
  };

  const handleRepoForGitHubChange = (data) => {
    setRepoForGitHub(data.target.value);
  };

  const handleAccessTokenForGitHubChange = (data) => {
    setAccessTokenForGitHub(data.target.value);
  };

  const textFieldStyles = {
    ".MuiInputBase-root": {
      fontSize: 12,
      fontWeight: 100,
    },
    ".MuiInputBase-input": { padding: "4px" },
  };

  const boxStyles = xcss({
    borderColor: "color.border.bold",
    borderStyle: "solid",
    borderRadius: "3px",
    borderWidth: "border.width",
  });

  const BitBucketIcon = (props) => {
    const { size } = props;
    return (
      <SVG size={size}>
        <path
          fill="currentColor"
          d="M2.65 3C2.3 3 2 3.3 2 3.65v.12l2.73 16.5c.07.42.43.73.85.73h13.05c.31 0 .59-.22.64-.54L22 3.77a.643.643 0 0 0-.54-.73c-.03-.01-.07-.01-.11-.01zM14.1 14.95H9.94L8.81 9.07h6.3z"
        />
      </SVG>
    );
  };

  const GitHubIcon = (props) => {
    const { size } = props;
    return (
      <SVG size={size}>
        <path
          fill="currentColor"
          d="M12.001 2c-5.525 0-10 4.475-10 10a9.99 9.99 0 0 0 6.837 9.488c.5.087.688-.213.688-.476c0-.237-.013-1.024-.013-1.862c-2.512.463-3.162-.612-3.362-1.175c-.113-.288-.6-1.175-1.025-1.413c-.35-.187-.85-.65-.013-.662c.788-.013 1.35.725 1.538 1.025c.9 1.512 2.337 1.087 2.912.825c.088-.65.35-1.087.638-1.337c-2.225-.25-4.55-1.113-4.55-4.938c0-1.088.387-1.987 1.025-2.687c-.1-.25-.45-1.275.1-2.65c0 0 .837-.263 2.75 1.024a9.3 9.3 0 0 1 2.5-.337c.85 0 1.7.112 2.5.337c1.913-1.3 2.75-1.024 2.75-1.024c.55 1.375.2 2.4.1 2.65c.637.7 1.025 1.587 1.025 2.687c0 3.838-2.337 4.688-4.562 4.938c.362.312.675.912.675 1.85c0 1.337-.013 2.412-.013 2.75c0 .262.188.574.688.474A10.02 10.02 0 0 0 22 12c0-5.525-4.475-10-10-10"
        />
      </SVG>
    );
  };

  return !isLoading ? (
    <>
      {isLoadFailed && (
        <SectionMessage appearance="error">
          <Text>An error occurred while loading...</Text>
        </SectionMessage>
      )}
      {isSaveFailed && (
        <SectionMessage appearance="error">
          <Text>An error occurred while saving...</Text>
        </SectionMessage>
      )}
      <Box padding="space.000">
        <Inline alignBlock="center" spread="space-between">
          <Button
            onClick={saveConfiguration}
            appearance="primary"
            spacing="compact"
            isLoading={isSaving}
            isDisabled={isLoadFailed}
          >
            Save
          </Button>
        </Inline>
      </Box>
      <Box padding="space.025"></Box>
      <Box padding="space.100" xcss={boxStyles}>
        <Inline alignBlock="center" alignInline="start">
          <BitBucketIcon size="small" />
          <Text size="small" weight="bold">
            BitBucket
          </Text>
        </Inline>
        <Stack>
          <Text size="small">workspace</Text>
          <TextField
            value={workspaceForBitBucket}
            onChange={handleWorkspaceForBitBucketChange}
            fullWidth
            sx={textFieldStyles}
          />
        </Stack>
        <Stack>
          <Text size="small">repository</Text>
          <TextField
            value={repoForBitBucket}
            onChange={handleRepoForBitBucketChange}
            fullWidth
            sx={textFieldStyles}
          />
        </Stack>
        <Stack>
          <Text size="small">Access Token</Text>
          <TextField
            type={"password"}
            value={accessTokenForBitBucket}
            onChange={handleAccessTokenForBitBucketChange}
            fullWidth
            sx={textFieldStyles}
          />
        </Stack>
      </Box>
      <Box padding="space.025"></Box>
      <Box padding="space.100" xcss={boxStyles}>
        <Inline alignBlock="center" alignInline="start">
          <GitHubIcon size="small" />
          <Text size="small" weight="bold">
            GitHub
          </Text>
        </Inline>
        <Stack>
          <Text size="small">owner</Text>
          <TextField
            value={ownerForGitHub}
            onChange={handleOwnerForGitHubChange}
            fullWidth
            sx={textFieldStyles}
          />
        </Stack>
        <Stack>
          <Text size="small">repository</Text>
          <TextField
            value={repoForGitHub}
            onChange={handleRepoForGitHubChange}
            fullWidth
            sx={textFieldStyles}
          />
        </Stack>
        <Stack>
          <Text size="small">Access Token</Text>
          <TextField
            type={"password"}
            value={accessTokenForGitHub}
            onChange={handleAccessTokenForGitHubChange}
            fullWidth
            sx={textFieldStyles}
          />
        </Stack>
      </Box>
    </>
  ) : (
    <>Loading...</>
  );
};

export default App;

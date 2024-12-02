import React, { useEffect, useState } from "react";

import { Box, Inline, Stack, Text, xcss } from "@atlaskit/primitives";
import { ButtonGroup } from "@atlaskit/button";
import Button, { IconButton } from "@atlaskit/button/new";
import Lozenge from "@atlaskit/lozenge";
import SVG from "@atlaskit/icon/svg";
import SettingsIcon from "@atlaskit/icon/glyph/settings";
import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import ChevronUpIcon from "@atlaskit/icon/glyph/chevron-up";
import HipchatChevronDoubleDownIcon from "@atlaskit/icon/glyph/hipchat/chevron-double-down";
import HipchatChevronDoubleUpIcon from "@atlaskit/icon/glyph/hipchat/chevron-double-up";
import { useThemeObserver, token } from "@atlaskit/tokens";
import { invoke, view } from "@forge/bridge";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import {
  AstBuilder,
  GherkinClassicTokenMatcher,
  Parser,
} from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

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
    extension: { project, issue },
  } = context;
  return (
    <ThemeProvider theme={currentTheme(theme.colorMode)}>
      <View project={project} issue={issue} />
    </ThemeProvider>
  );
};

const FIELD_STATUS = {
  TODO: 0,
  PASSED: 1,
  FAILED: 2,
  SKIPPED: 3,
};

const KEYWORD_TYPE = {
  GIVEN: "Context",
  WHEN: "Action",
  THEN: "Outcome",
};

const KEYWORD_TYPES = [
  KEYWORD_TYPE.GIVEN,
  KEYWORD_TYPE.WHEN,
  KEYWORD_TYPE.THEN,
];

const isGherkinDocumentValid = (gherkinDocument) => {
  return gherkinDocument?.feature?.name && gherkinDocument?.feature?.children;
};

const convertToGherkinDocument = (gherkinText) => {
  try {
    const uuidFn = IdGenerator.uuid();
    const builder = new AstBuilder(uuidFn);
    const matcher = new GherkinClassicTokenMatcher();
    const parser = new Parser(builder, matcher);
    const gherkinDocument = parser.parse(gherkinText);
    if (!isGherkinDocumentValid(gherkinDocument)) {
      return undefined;
    }
    return gherkinDocument;
  } catch (e) {
    return undefined;
  }
};

const getScenarioChildren = (gherkinDocument) => {
  return gherkinDocument.feature.children.filter((child) => !!child.scenario);
};

const getStepText = (step) => {
  if (step.docString?.content) {
    return `${step.text ?? ""}\n${step.docString.content}`;
  } else {
    return `${step.text ?? ""}`;
  }
};

const sumUpStatus = (gherkinDocument, status) => {
  const scenarios = getScenarioChildren(gherkinDocument).map(
    (child) => child.scenario
  );
  const todo =
    scenarios.filter(
      (_scenario, index) => status[`scenario_${index}`] === FIELD_STATUS.TODO
    ).length ?? 0;
  const passed =
    scenarios.filter(
      (_scenario, index) => status[`scenario_${index}`] === FIELD_STATUS.PASSED
    ).length ?? 0;
  const failed =
    scenarios.filter(
      (_scenario, index) => status[`scenario_${index}`] === FIELD_STATUS.FAILED
    ).length ?? 0;
  const skipped =
    scenarios.filter(
      (_scenario, index) => status[`scenario_${index}`] === FIELD_STATUS.SKIPPED
    ).length ?? 0;
  return { todo, passed, failed, skipped };
};

const color = (gherkinDocument, status) => {
  const { todo, passed, failed, skipped } = sumUpStatus(
    gherkinDocument,
    status
  );
  if ((passed > 0 || skipped > 0) && failed === 0 && todo === 0) {
    return "color.background.success";
  } else if (failed > 0) {
    return "color.background.danger";
  } else if ((passed > 0 || skipped > 0) && todo > 0) {
    return "color.background.warning";
  } else {
    return "color.background.input.hovered";
  }
};

const View = ({ project, issue }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [gherkin, setGherkin] = useState();
  const [gherkinDocument, setGherkinDocument] = useState();
  const [status, setStatus] = useState();
  const [gitAvailable, setGitAvailable] = useState({});
  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  const [isScenarioListOpen, setIsScenarioListOpen] = useState(false);
  const openConfiguration = () => setIsConfigurationOpen(true);
  const closeConfiguration = () => setIsConfigurationOpen(false);

  useEffect(() => {
    resetIssueProperty();
  }, []);

  const resetIssueProperty = () => {
    setIsLoading(true);
    invoke("getIssueProperty", {
      projectId: project.id,
      issueId: issue.id,
    })
      .then((data) => {
        const { gherkin, status, bitBucketAvailable, gitHubAvailable } = data;
        setIsScenarioListOpen(false);
        setGherkin(gherkin);
        setGherkinDocument(convertToGherkinDocument(gherkin));
        setGitAvailable({ bitBucketAvailable, gitHubAvailable });
        setStatus(status);
        setIsLoading(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const toggleChevron = () => (event) => {
    setIsScenarioListOpen(!isScenarioListOpen);
  };

  return !isLoading ? (
    <>
      {gherkinDocument && status && (
        <Box
          padding="space.050"
          backgroundColor={color(gherkinDocument, status)}
        >
          <Inline alignBlock="center" spread="space-between">
            <Box>
              <Inline space="space.050" alignBlock="center" shouldWrap>
                <Text size="small" as="strong">
                  {gherkinDocument.feature?.name}
                </Text>
              </Inline>
              <Inline space="space.050" alignBlock="center" shouldWrap>
                <Lozenge appearance="success" isBold>
                  {"PASSED: " +
                    (sumUpStatus(gherkinDocument, status).passed || 0)}
                </Lozenge>
                <Lozenge appearance="removed" isBold>
                  {"FAILED: " +
                    (sumUpStatus(gherkinDocument, status).failed || 0)}
                </Lozenge>
                <Lozenge appearance="default" isBold>
                  {"SKIPPED: " +
                    (sumUpStatus(gherkinDocument, status).skipped || 0)}
                </Lozenge>
                <Lozenge appearance="default">
                  {"TODO: " + (sumUpStatus(gherkinDocument, status).todo || 0)}
                </Lozenge>
              </Inline>
            </Box>
            <Inline alignBlock="center" alignInline="end">
              <IconButton
                icon={isScenarioListOpen ? ChevronUpIcon : ChevronDownIcon}
                appearance="subtle"
                spacing="compact"
                onClick={toggleChevron()}
              ></IconButton>
            </Inline>
          </Inline>
        </Box>
      )}
      {isScenarioListOpen && (
        <ScenarioList
          issue={issue}
          gherkinDocument={gherkinDocument}
          status={status}
          setStatus={setStatus}
        />
      )}
      {!isConfigurationOpen && (
        <Box padding="space.050">
          <Inline alignBlock="center" alignInline="end">
            <IconButton
              icon={SettingsIcon}
              appearance="subtle"
              spacing="compact"
              onClick={openConfiguration}
            ></IconButton>
          </Inline>
        </Box>
      )}
      {isConfigurationOpen && (
        <Config
          project={project}
          issue={issue}
          gherkin={gherkin}
          gitAvailable={gitAvailable}
          resetIssueProperty={resetIssueProperty}
          closeConfiguration={closeConfiguration}
        />
      )}
    </>
  ) : (
    <>Loading...</>
  );
};

const Config = ({
  project,
  issue,
  gherkin,
  gitAvailable,
  resetIssueProperty,
  closeConfiguration,
}) => {
  const [editedGherkin, setEditedGherkin] = useState(gherkin);
  const [isGherkinInvalid, setIsGherkinInvalid] = useState();
  const [isSaving, setIsSaving] = useState(false);
  const [isBitBucketLoading, setIsBitBucketLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);

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

  const saveGherkinDocument = (event) => {
    setIsSaving(true);
    if (!editedGherkin || editedGherkin.length === 0) {
      invoke("clearIssueProperty", {
        issueId: issue.id,
      })
        .then((data) => {
          if (data) {
            resetIssueProperty();
            closeConfiguration();
          }
        })
        .finally(() => {
          setIsSaving(false);
        });
    } else {
      const gherkinDocument = convertToGherkinDocument(editedGherkin);
      if (!gherkinDocument) {
        setIsSaving(false);
        return;
      }
      const status = {
        title: gherkinDocument.feature?.name ?? "",
      };
      let keywordType;
      getScenarioChildren(gherkinDocument).forEach((child, index) => {
        status[`scenario_${index}`] = FIELD_STATUS.TODO;
        child.scenario?.steps?.forEach((step, stepIndex) => {
          if (KEYWORD_TYPES.includes(step.keywordType)) {
            keywordType = step.keywordType;
          }
          if (keywordType === KEYWORD_TYPE.THEN) {
            status[`scenario_${index}_${stepIndex}`] = FIELD_STATUS.TODO;
          }
        });
      });
      invoke("initIssueProperty", {
        gherkin: editedGherkin,
        status: status,
        issueId: issue.id,
      })
        .then((data) => {
          if (data) {
            resetIssueProperty();
            closeConfiguration();
          }
        })
        .finally(() => {
          setIsSaving(false);
        });
    }
  };

  const getGherkinTextFromBitBucket = () => {
    setIsBitBucketLoading(true);
    invoke("getGherkinTextFromBitBucket", {
      projectId: project.id,
      issueKey: issue.key,
    })
      .then((data) => {
        if (data?.value) {
          setEditedGherkin(data.value);
        }
      })
      .finally(() => {
        setIsBitBucketLoading(false);
      });
  };

  const getGherkinTextFromGitHub = () => {
    setIsGitHubLoading(true);
    invoke("getGherkinTextFromGitHub", {
      projectId: project.id,
      issueKey: issue.key,
    })
      .then((data) => {
        if (data?.value) {
          setEditedGherkin(data.value);
        }
      })
      .finally(() => {
        setIsGitHubLoading(false);
      });
  };

  const changeGherkin = (event) => {
    const gherkinText = event.target.value;
    setEditedGherkin(gherkinText);
    if (!gherkinText || gherkinText.length === 0) {
      setIsGherkinInvalid(false);
    } else {
      const gherkinDocument = convertToGherkinDocument(gherkinText);
      setIsGherkinInvalid(!gherkinDocument);
    }
  };

  const textAreaStyles = {
    ".MuiInputBase-root": {
      fontSize: 12,
      fontWeight: 100,
      padding: "8px",
    },
    ".MuiInputBase-input": { padding: "1px" },
  };

  const jsonErrorBoxStyles = xcss({
    borderColor: "color.border.danger",
    borderStyle: "solid",
    borderRadius: "3px",
    borderWidth: "border.width",
  });

  return (
    <>
      <Box padding="space.100"></Box>
      <Box>
        <Box padding="space.050">
          <Inline alignBlock="center" spread="space-between">
            <Inline alignBlock="center">
              <Text weight="bold">Gherkin Document</Text>
            </Inline>
            <Inline alignBlock="center" alignInline="end">
              <IconButton
                icon={(iconProps) => (
                  <BitBucketIcon {...iconProps} size="small" />
                )}
                isDisabled={!gitAvailable.bitBucketAvailable}
                isLoading={isBitBucketLoading}
                appearance="subtle"
                spacing="compact"
                onClick={getGherkinTextFromBitBucket}
                isTooltipDisabled={false}
                label={`import '${issue.key}.feature' file from BitBucket`}
              ></IconButton>
              <IconButton
                icon={(iconProps) => <GitHubIcon {...iconProps} size="small" />}
                isDisabled={!gitAvailable.gitHubAvailable}
                isLoading={isGitHubLoading}
                appearance="subtle"
                spacing="compact"
                onClick={getGherkinTextFromGitHub}
                isTooltipDisabled={false}
                label={`import '${issue.key}.feature' file from GitHub`}
              ></IconButton>
            </Inline>
          </Inline>
        </Box>
        <Box padding="space.050" xcss={isGherkinInvalid && jsonErrorBoxStyles}>
          <Stack>
            <TextField
              value={editedGherkin}
              onChange={changeGherkin}
              multiline
              maxRows={20}
              minRows={10}
              fullWidth
              sx={textAreaStyles}
            />
          </Stack>
        </Box>
        <Box padding="space.050">
          <ButtonGroup>
            <Button
              onClick={saveGherkinDocument}
              appearance="primary"
              isLoading={isSaving}
              isDisabled={isGherkinInvalid}
            >
              Save
            </Button>
            <Button onClick={closeConfiguration} appearance="subtle">
              Cancel
            </Button>
          </ButtonGroup>
        </Box>
      </Box>
    </>
  );
};

const ScenarioList = ({ issue, gherkinDocument, status, setStatus }) => {
  const [openIndex, setOpenIndex] = useState(-1);
  const openStep = (index) => setOpenIndex(index);
  const closeStep = () => setOpenIndex(-1);

  const handleFieldCheckbox = (id, childCount) => (event) => {
    const newStatus = structuredClone(status);
    if (event.target.checked) {
      newStatus[id] = FIELD_STATUS.PASSED;
      for (let i = 0; i < childCount; i++) {
        const targetId = `${id}_${i}`;
        if (newStatus[targetId] !== undefined) {
          newStatus[targetId] = FIELD_STATUS.PASSED;
        }
      }
    } else {
      newStatus[id] = FIELD_STATUS.TODO;
      for (let i = 0; i < childCount; i++) {
        const targetId = `${id}_${i}`;
        if (newStatus[targetId] !== undefined) {
          newStatus[targetId] = FIELD_STATUS.TODO;
        }
      }
    }
    setStatus(newStatus);
    invoke("updateIssueProperty", {
      status: newStatus,
      issueId: issue.id,
    }).then((data) => {
      if (data !== true) {
        setStatus(status);
      }
    });
  };

  const handleChange = (id, childCount) => (event) => {
    const newStatus = structuredClone(status);
    newStatus[id] = event.target.value;
    if (
      event.target.value === FIELD_STATUS.TODO ||
      event.target.value === FIELD_STATUS.SKIPPED
    ) {
      for (let i = 0; i < childCount; i++) {
        const targetId = `${id}_${i}`;
        if (newStatus[targetId] !== undefined) {
          newStatus[targetId] = FIELD_STATUS.TODO;
        }
      }
    } else if (event.target.value === FIELD_STATUS.PASSED) {
      for (let i = 0; i < childCount; i++) {
        const targetId = `${id}_${i}`;
        if (newStatus[targetId] !== undefined) {
          newStatus[targetId] = FIELD_STATUS.PASSED;
        }
      }
    }
    if (event.target.value === FIELD_STATUS.SKIPPED) {
      closeStep();
    }
    setStatus(newStatus);
    invoke("updateIssueProperty", {
      status: newStatus,
      issueId: issue.id,
    }).then((data) => {
      if (data !== true) {
        setStatus(status);
      }
    });
  };

  const backgroundColors = [
    token("color.background.neutral"),
    token("color.background.success.bold"),
    token("color.background.danger.bold"),
    token("color.background.neutral.bold"),
  ];

  const fontColors = [
    token("color.text"),
    token("color.text.inverse"),
    token("color.text.inverse"),
    token("color.text.inverse"),
  ];

  const textAreaStyles = {
    ".MuiInputBase-root": {
      fontSize: 10,
      fontWeight: 100,
      padding: "4px",
    },
  };

  const description = gherkinDocument?.feature?.description;
  const background = gherkinDocument?.feature?.children?.find(
    (child) => !!child.background
  )?.background;

  return (
    <>
      <Box padding="space.050">
        {description && (
          <Stack>
            <Text size="small" weight="bold">
              Description
            </Text>
            <TextField
              value={description}
              multiline
              fullWidth
              sx={textAreaStyles}
            />
          </Stack>
        )}
        {background && (
          <Stack>
            <Text size="small" weight="bold">
              Given
            </Text>
            {background.steps.map((step) => (
              <TextField
                value={getStepText(step)}
                multiline
                fullWidth
                sx={textAreaStyles}
              />
            ))}
          </Stack>
        )}
        {getScenarioChildren(gherkinDocument).map((child, index) => {
          const id = `scenario_${index}`;
          const scenarioStatus = status[id];
          const label = child.scenario?.name ?? "";
          const steps = child.scenario?.steps ?? [];
          const checkboxStyles = {
            ".MuiButtonBase-root": {
              width: 24,
              padding: 0,
              margin: "0 4px 0 4px",
            },
            ".MuiSvgIcon-root": { width: 16 },
            ".MuiFormControlLabel-label": { fontSize: 11 },
          };
          const selectStyles = {
            minWidth: 80,
            ".MuiInputBase-root": {
              backgroundColor: backgroundColors[scenarioStatus],
              color: fontColors[scenarioStatus],
              fontWeight: "bold",
              fontSize: 10,
              maxHeight: 20,
            },
            ".MuiSelect-select": { padding: "2px 20px 2px 5.5px !important" },
            ".MuiSvgIcon-root": { right: 1 },
          };
          const menuItemStyles = {
            fontSize: 10,
            maxHeight: 20,
            minHeight: 20,
            padding: "2px 20px 2px 5.5px !important",
          };

          return (
            <>
              <Box padding="space.050">
                <Inline alignBlock="center" spread="space-between">
                  <Inline alignBlock="center">
                    <FormControlLabel
                      sx={checkboxStyles}
                      label={label}
                      disabled={scenarioStatus === FIELD_STATUS.SKIPPED}
                      control={
                        <Checkbox
                          checked={scenarioStatus === FIELD_STATUS.PASSED}
                          onChange={handleFieldCheckbox(id, steps.length)}
                        />
                      }
                    />
                  </Inline>
                  <Inline alignBlock="center" alignInline="end">
                    <FormControl sx={selectStyles} size="small">
                      <Select
                        value={scenarioStatus}
                        onChange={handleChange(id, steps.length)}
                        MenuProps={{
                          autoFocus: false,
                          disableAutoFocusItem: true,
                          disableEnforceFocus: true,
                          disableAutoFocus: true,
                        }}
                      >
                        <MenuItem value={0} sx={menuItemStyles}>
                          TODO
                        </MenuItem>
                        <MenuItem value={1} sx={menuItemStyles}>
                          PASSED
                        </MenuItem>
                        <MenuItem value={2} sx={menuItemStyles}>
                          FAILED
                        </MenuItem>
                        <MenuItem value={3} sx={menuItemStyles}>
                          SKIPPED
                        </MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton
                      icon={
                        openIndex === index
                          ? HipchatChevronDoubleUpIcon
                          : HipchatChevronDoubleDownIcon
                      }
                      isDisabled={
                        scenarioStatus === FIELD_STATUS.SKIPPED ||
                        steps.length === 0
                      }
                      appearance="subtle"
                      spacing="compact"
                      onClick={() =>
                        openIndex === index ? closeStep(index) : openStep(index)
                      }
                    ></IconButton>
                  </Inline>
                </Inline>
              </Box>
              {openIndex === index && (
                <StepList
                  issue={issue}
                  index={index}
                  gherkinDocument={gherkinDocument}
                  status={status}
                  setStatus={setStatus}
                />
              )}
            </>
          );
        })}{" "}
      </Box>
    </>
  );
};

const StepList = ({ issue, index, gherkinDocument, status, setStatus }) => {
  const handleChange = (id, parentId, childCount) => (event) => {
    const newStatus = structuredClone(status);
    newStatus[id] = event.target.value;
    if (event.target.value === FIELD_STATUS.FAILED) {
      newStatus[parentId] = FIELD_STATUS.FAILED;
    } else {
      let allPassed = true;
      for (let i = 0; i < childCount; i++) {
        const targetId = `${parentId}_${i}`;
        if (
          newStatus[targetId] !== undefined &&
          newStatus[targetId] !== FIELD_STATUS.PASSED
        ) {
          allPassed = false;
          break;
        }
      }
      if (allPassed) {
        newStatus[parentId] = FIELD_STATUS.PASSED;
      }
    }
    setStatus(newStatus);
    invoke("updateIssueProperty", {
      status: newStatus,
      issueId: issue.id,
    }).then((data) => {
      if (data !== true) {
        setStatus(status);
      }
    });
  };

  const backgroundColors = [
    token("color.background.neutral"),
    token("color.background.success.bold"),
    token("color.background.danger.bold"),
  ];

  const fontColors = [
    token("color.text"),
    token("color.text.inverse"),
    token("color.text.inverse"),
  ];

  const boxStyles = xcss({
    borderColor: "color.border.bold",
    borderStyle: "solid",
    borderRadius: "3px",
    borderWidth: "border.width",
  });

  const textAreaStyles = {
    ".MuiInputBase-root": {
      fontSize: 11,
      fontWeight: 100,
      padding: "4px",
    },
  };

  const steps =
    getScenarioChildren(gherkinDocument)[index]?.scenario?.steps ?? [];
  const examples =
    getScenarioChildren(gherkinDocument)[index]?.scenario?.examples ?? [];

  let keywordType;

  return (
    <>
      <Box
        paddingBlockStart="space.025"
        paddingBlockEnd="space.100"
        paddingInlineStart="space.100"
        paddingInlineEnd="space.100"
        xcss={boxStyles}
      >
        {steps.map((step, stepIndex) => {
          const prevKeywordType = keywordType;
          if (KEYWORD_TYPES.includes(step.keywordType)) {
            keywordType = step.keywordType;
          }
          const id = `scenario_${index}_${stepIndex}`;
          const parentId = `scenario_${index}`;
          const stepStatus = status[id];
          const text = getStepText(step);
          const selectStyles = {
            minWidth: 80,
            ".MuiInputBase-root": {
              backgroundColor: backgroundColors[stepStatus],
              color: fontColors[stepStatus],
              fontWeight: "bold",
              fontSize: 10,
              maxHeight: 20,
            },
            ".MuiSelect-select": { padding: "2px 20px 2px 5.5px !important" },
            ".MuiSvgIcon-root": { right: 1 },
          };
          const menuItemStyles = {
            fontSize: 10,
            maxHeight: 20,
            minHeight: 20,
            padding: "2px 20px 2px 5.5px !important",
          };

          return (
            <>
              {KEYWORD_TYPES.includes(step.keywordType) &&
                step.keywordType !== prevKeywordType && (
                  <Box padding="space.000">
                    <Text size="small" weight="bold">
                      {step.keyword}
                    </Text>
                  </Box>
                )}
              <Box paddingBlock="space.025">
                <TextField
                  value={text}
                  multiline
                  fullWidth
                  sx={textAreaStyles}
                />
              </Box>
              {keywordType === KEYWORD_TYPE.THEN && (
                <Box paddingBlock="space.025">
                  <Inline alignBlock="center" alignInline="end">
                    <FormControl sx={selectStyles} size="small">
                      <Select
                        value={stepStatus}
                        onChange={handleChange(id, parentId, steps.length)}
                        MenuProps={{
                          autoFocus: false,
                          disableAutoFocusItem: true,
                          disableEnforceFocus: true,
                          disableAutoFocus: true,
                        }}
                      >
                        <MenuItem value={0} sx={menuItemStyles}></MenuItem>
                        <MenuItem value={1} sx={menuItemStyles}>
                          PASSED
                        </MenuItem>
                        <MenuItem value={2} sx={menuItemStyles}>
                          FAILED
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Inline>
                </Box>
              )}
              {step.dataTable && (
                <Box paddingBlock="space.025">
                  {getDataTable(step.dataTable)}
                </Box>
              )}
            </>
          );
        })}{" "}
        {examples.map((example, index) => {
          return (
            <>
              {index === 0 && (
                <Box padding="space.000">
                  <Text size="small" weight="bold">
                    Example
                  </Text>
                </Box>
              )}
              <Box paddingBlock="space.025">{getExampleTable(example)}</Box>
            </>
          );
        })}{" "}
      </Box>
    </>
  );
};

const getExampleTable = (example) => {
  return (
    <TableContainer>
      <Table size="small" aria-label="example table">
        <TableHead>
          <TableRow
            sx={{
              "td, th": {
                fontSize: "10px",
                fontWeight: "bold",
                padding: "4px",
              },
            }}
          >
            {example.tableHeader?.cells?.map((cell) => (
              <TableCell>{cell.value}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {example.tableBody?.map((row) => (
            <TableRow sx={{ "td, th": { fontSize: "10px", padding: "4px" } }}>
              {row.cells?.map((cell) => (
                <TableCell>{cell.value}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const getDataTable = (dataTable) => {
  return (
    <TableContainer>
      <Table size="small" aria-label="example table">
        <TableBody>
          {dataTable.rows?.map((row) => (
            <TableRow sx={{ "td, th": { fontSize: "10px", padding: "4px" } }}>
              {row.cells?.map((cell) => (
                <TableCell>{cell.value}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default App;

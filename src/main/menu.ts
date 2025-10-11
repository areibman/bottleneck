import {
  Menu,
  MenuItemConstructorOptions,
  BrowserWindow,
  app,
  shell,
} from "electron";

export function createMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === "darwin";

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Preferences",
                accelerator: "Cmd+,",
                click: () => {
                  mainWindow.webContents.send("open-preferences");
                },
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ] as MenuItemConstructorOptions[],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Draft PR",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow.webContents.send("new-draft-pr");
          },
        },
        {
          label: "Clone Repository",
          accelerator: "CmdOrCtrl+Shift+C",
          click: () => {
            mainWindow.webContents.send("clone-repository");
          },
        },
        { type: "separator" },
        {
          label: "Sync All",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => {
            mainWindow.webContents.send("sync-all");
          },
        },
        { type: "separator" },
        isMac ? { role: "close" as const } : { role: "quit" as const },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { type: "separator" },
        {
          label: "Find",
          accelerator: "CmdOrCtrl+F",
          click: () => {
            mainWindow.webContents.findInPage("");
          },
        },
        {
          label: "Find Next",
          accelerator: "CmdOrCtrl+G",
          click: () => {
            mainWindow.webContents.findInPage("", { findNext: true });
          },
        },
        {
          label: "Find Previous",
          accelerator: "CmdOrCtrl+Shift+G",
          click: () => {
            mainWindow.webContents.findInPage("", { findNext: false });
          },
        },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" as const },
              { role: "delete" as const },
              { role: "selectAll" as const },
              { type: "separator" as const },
              {
                label: "Speech",
                submenu: [
                  { role: "startSpeaking" as const },
                  { role: "stopSpeaking" as const },
                ],
              },
            ]
          : [
              { role: "delete" as const },
              { type: "separator" as const },
              { role: "selectAll" as const },
            ]),
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Command Palette",
          accelerator: "CmdOrCtrl+Shift+P",
          click: () => {
            mainWindow.webContents.send("open-command-palette");
          },
        },
        { type: "separator" },
        {
          label: "Toggle Sidebar",
          accelerator: "CmdOrCtrl+B",
          click: () => {
            mainWindow.webContents.send("toggle-sidebar");
          },
        },
        {
          label: "Toggle Right Panel",
          accelerator: "CmdOrCtrl+Shift+B",
          click: () => {
            mainWindow.webContents.send("toggle-right-panel");
          },
        },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Navigate",
      submenu: [
        {
          label: "Go to PR",
          accelerator: "CmdOrCtrl+P",
          click: () => {
            mainWindow.webContents.send("go-to-pr");
          },
        },
        {
          label: "Go to File",
          accelerator: "CmdOrCtrl+T",
          click: () => {
            mainWindow.webContents.send("go-to-file");
          },
        },
        { type: "separator" },
        {
          label: "Next PR",
          accelerator: "CmdOrCtrl+]",
          click: () => {
            mainWindow.webContents.send("next-pr");
          },
        },
        {
          label: "Previous PR",
          accelerator: "CmdOrCtrl+[",
          click: () => {
            mainWindow.webContents.send("previous-pr");
          },
        },
        { type: "separator" },
        {
          label: "Next File",
          accelerator: "Alt+Down",
          click: () => {
            mainWindow.webContents.send("next-file");
          },
        },
        {
          label: "Previous File",
          accelerator: "Alt+Up",
          click: () => {
            mainWindow.webContents.send("previous-file");
          },
        },
        { type: "separator" },
        {
          label: "Next Comment",
          accelerator: "Shift+N",
          click: () => {
            mainWindow.webContents.send("next-comment");
          },
        },
        {
          label: "Previous Comment",
          accelerator: "Shift+P",
          click: () => {
            mainWindow.webContents.send("previous-comment");
          },
        },
      ],
    },
    {
      label: "Review",
      submenu: [
        {
          label: "Approve",
          accelerator: "CmdOrCtrl+Shift+A",
          click: () => {
            mainWindow.webContents.send("approve-pr");
          },
        },
        {
          label: "Request Changes",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            mainWindow.webContents.send("request-changes");
          },
        },
        {
          label: "Comment",
          accelerator: "CmdOrCtrl+Enter",
          click: () => {
            mainWindow.webContents.send("submit-comment");
          },
        },
        { type: "separator" },
        {
          label: "Mark File as Viewed",
          accelerator: "V",
          click: () => {
            mainWindow.webContents.send("mark-file-viewed");
          },
        },
        {
          label: "Toggle Diff View",
          accelerator: "D",
          click: () => {
            mainWindow.webContents.send("toggle-diff-view");
          },
        },
        {
          label: "Toggle Whitespace",
          accelerator: "W",
          click: () => {
            mainWindow.webContents.send("toggle-whitespace");
          },
        },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" },
        ...(isMac
          ? [
              { type: "separator" as const },
              { role: "front" as const },
              { type: "separator" as const },
              { role: "window" as const },
            ]
          : []),
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: () => {
            shell.openExternal("https://github.com/bottleneck-app/docs");
          },
        },
        {
          label: "Report Issue",
          click: () => {
            shell.openExternal(
              "https://github.com/bottleneck-app/bottleneck/issues",
            );
          },
        },
        { type: "separator" },
        {
          label: "Keyboard Shortcuts",
          accelerator: "CmdOrCtrl+/",
          click: () => {
            mainWindow.webContents.send("show-shortcuts");
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

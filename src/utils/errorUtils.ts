import { setUserError } from "vscode-extension-telemetry-wrapper";
import { promptToSettingMavenExecutable } from "./mavenUtils";
import { showTroubleshootingDialog } from "./uiUtils";

// tslint:disable-next-line:export-name
export class UserError extends Error {
  constructor(msg?: string) {
    super(msg);
    setUserError(this);
  }
}

export class MavenNotFoundError extends UserError {
  constructor() {
    super("Maven executable not found.");
  }
}

export class OperationCanceledError extends UserError {
}

// tslint:disable-next-line:max-classes-per-file
export class JavaExtensionNotActivatedError extends Error {
  constructor(msg?: string) {
      super(msg);
      setUserError(this);
  }
}

export async function generalErrorHandler(commandName: string, error: Error): Promise<void> {
  if (error instanceof OperationCanceledError) {
    // swallow
  } else if (error instanceof MavenNotFoundError) {
    await promptToSettingMavenExecutable();
  } else {
    await showTroubleshootingDialog(`Command "${commandName}" fails. ${error.message}`);
  }
  throw error;
}

import { setUserError } from "vscode-extension-telemetry-wrapper";

// tslint:disable-next-line:export-name
export class UserError extends Error {
  constructor(msg: string) {
    super(msg);
    setUserError(this);
  }
}

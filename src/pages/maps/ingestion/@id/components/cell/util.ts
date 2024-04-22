/*
  * Converts a string to a boolean or undefined
 */
export const toBoolean = (value: string | boolean): boolean | undefined => {
  switch(value) {
    case "true":
      return true;
    case "false":
      return false;
    case true:
      return true;
    case false:
      return false;
    default:
      return undefined;
  }
}


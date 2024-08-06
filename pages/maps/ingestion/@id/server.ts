interface Error {
  code: number;
  text: string;
}

interface Patch {
  id: number;
  function: () => Response;
  error: Error;
  attempts: number;
}

// Holds the current state of the patching process
class PatchManager {
  constructor() {
    this.active = [];
    this.success = [];
    this.failed = [];
    this.abandoned = [];
  }

  // Wraps the patch function and handles in the context of the manager
  async runPatch(patch: Patch) {
    patch.attempts += 1;

    try {
      let response = await patch.function();

      if (response.status == 400) {
        patch.error.code = response.status;
        patch.error.text = (await response.json())["details"];
        this.abandoned.push(patch);
      } else if (response.status == 200) {
        this.success.push(patch);
      } else {
        this.failed.push(patch);
      }
    } catch (e) {
      patch.error.code = response.status;
      patch.error.text = (await response.json())["details"];
      this.failed.push(patch);
    }
  }
}

async function getTable() {}

async function patchTable(value, db_id) {}

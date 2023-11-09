import type { MatcherFunction } from "expect";
import { WaitForRenderTimeoutError } from "../internal/index.js";
import type {
  NextRenderOptions,
  ProfiledComponent,
  ProfiledHook,
} from "../internal/index.js";

export const toRerender: MatcherFunction<[options?: NextRenderOptions]> =
  async function (
    _profiled: ProfiledComponent<any, any> | ProfiledHook<any, any>,
    options?: NextRenderOptions
  ) {
    const profiled =
      "ProfiledComponent" in _profiled
        ? _profiled.ProfiledComponent
        : _profiled;
    const hint = this.utils.matcherHint("toRerender", "ProfiledComponent", "");
    let pass = true;
    try {
      await profiled.waitForNextRender({ timeout: 100, ...options });
    } catch (e) {
      if (e instanceof WaitForRenderTimeoutError) {
        pass = false;
      } else {
        throw e;
      }
    }

    return {
      pass,
      message() {
        return (
          hint +
          `\n\nExpected component to${pass ? " not" : ""} rerender, ` +
          `but it did${pass ? "" : " not"}.`
        );
      },
    };
  };

/** to be thrown to "break" test execution and fail it */
const failed = {};

export const toRenderExactlyTimes: MatcherFunction<
  [times: number, options?: NextRenderOptions]
> = async function (
  _profiled: ProfiledComponent<any, any> | ProfiledHook<any, any>,
  times: number,
  optionsPerRender?: NextRenderOptions
) {
  const profiled =
    "ProfiledComponent" in _profiled ? _profiled.ProfiledComponent : _profiled;
  const options = { timeout: 100, ...optionsPerRender };
  const hint = this.utils.matcherHint("toRenderExactlyTimes");
  let pass = true;
  try {
    if (profiled.currentRenderCount() > times) {
      throw failed;
    }
    try {
      while (profiled.currentRenderCount() < times) {
        await profiled.waitForNextRender(options);
      }
    } catch (e) {
      // timeouts here should just fail the test, rethrow other errors
      throw e instanceof WaitForRenderTimeoutError ? failed : e;
    }
    try {
      await profiled.waitForNextRender(options);
    } catch (e) {
      // we are expecting a timeout here, so swallow that error, rethrow others
      if (!(e instanceof WaitForRenderTimeoutError)) {
        throw e;
      }
    }
  } catch (e) {
    if (e === failed) {
      pass = false;
    } else {
      throw e;
    }
  }
  return {
    pass,
    message() {
      return (
        hint +
        ` Expected component to${pass ? " not" : ""} render exactly ${times}.` +
        ` It rendered ${profiled.currentRenderCount()} times.`
      );
    },
  };
};

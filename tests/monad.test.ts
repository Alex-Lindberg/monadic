import {
  verifyInput,
  asyncFetchAdditionalData,
  remapData,
  RequestType,
  VerifiedRequestType,
  WithAdditionalDataType,
  asyncFetchAdditionalDataWithError,
  generateMatches,
  BadRequestError,
  GatewayError,
  OtherError,
} from "../src/mock";
import { Monad } from "../src/monad";
import { Either, Failure, HttpError, MatchCondition, Success } from "../src/util";

const mockInputTests = () => {
  it("correctly verifies valid input", async () => {
    const input: RequestType = { name: "Alice" };
    const result = await verifyInput(input);
    expect(result).toEqual({ name: "Alice" });
  });

  it("fetches additional data correctly after a delay", async () => {
    const input: VerifiedRequestType = { name: "Alice" };
    const startTime = Date.now();
    const result = await asyncFetchAdditionalData(input);
    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(10); // ensuring delay
    expect(result).toEqual({ name: "Alice", age: 30 }); // checking returned data
  });

  it("remaps data correctly", async () => {
    const input: WithAdditionalDataType = { name: "Alice", age: 30 };
    const result = await remapData(input);
    expect(result).toEqual({ customer: { name: "Alice", age: 30 } });
  });
};

const basicMonadTests = () => {
  it("processes request correctly", async () => {
    const request: RequestType = { name: "Alice" };
    const result = await Monad.of<RequestType>(request)
      .flatMap(verifyInput)
      .flatMap(asyncFetchAdditionalData)
      .flatMap(remapData)
      .yield();
    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ customer: { name: "Alice", age: 30 } });
    }
  });

  it("handles and propagates errors correctly", async () => {
    const badRequest: RequestType = { name: "" };
    const monad = Monad.of<RequestType>(badRequest)
      .flatMap(verifyInput)
      .flatMap(asyncFetchAdditionalData)
      .flatMap(remapData);
    const result = await monad.yield();
    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("Invalid input");
    }
  });

  it("successfully processes with synchronous functions", async () => {
    const request: RequestType = { name: "Alice" };
    const result = await Monad.of(request)
      .flatMap(verifyInput)
      .flatMap((data) => ({ ...data, age: 30 })) // synchronous operation
      .flatMap((data) => ({ customer: { ...data } })) // synchronous operation
      .yield();
    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ customer: { name: "Alice", age: 30 } });
    }
  });

  it("handles synchronous errors correctly", async () => {
    const badRequest: RequestType = { name: "" }; // This should fail verification
    const result = await Monad.of(badRequest)
      .flatMap(verifyInput) // This should throw an error
      .yield();
    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("Invalid input");
    }
  });

  it("handles asynchronous errors correctly", async () => {
    const badRequest: VerifiedRequestType = { name: "Alice" };
    // Mocking asyncFetchAdditionalData to simulate an error
    const asyncFetchAdditionalDataWithError = async (data: VerifiedRequestType) => {
      throw new Error("Async error");
    };
    const result = await Monad.of(badRequest).flatMap(asyncFetchAdditionalDataWithError).yield();
    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("Async error");
    }
  });

  it("works with various data types", async () => {
    const request = 5; // Using a number instead of an object
    const double = (x: number) => x * 2; // Synchronous operation to double the number
    const result = await Monad.of(request).flatMap(double).yield();
    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toBe(10); // Expecting doubled value
    }
  });

  it("maps values correctly", async () => {
    const request: RequestType = { name: "Alice" };

    const result = await Monad.of<RequestType>(request)
      .flatMap(verifyInput)
      .flatMap(asyncFetchAdditionalData)
      .map((data) => ({ customer: { ...data, height: 168 } }))
      .yield();

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({
        customer: { name: "Alice", age: 30, height: 168 },
      });
    }
  });

  it("should use map with async functions", async () => {
    const request: RequestType = { name: "Alice" };

    const result = await Monad.of<RequestType>(request)
      .flatMap(verifyInput)
      .flatMap(asyncFetchAdditionalData)
      .map(async (data) => ({ customer: { ...data } })) // Misusing map with async function
      .yield();

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ customer: { name: "Alice", age: 30 } });
    }
  });

  it("should use flatMap with async functions", async () => {
    const request: RequestType = { name: "Alice" };

    const result = await Monad.of<RequestType>(request)
      .flatMap(verifyInput)
      .flatMap(asyncFetchAdditionalData)
      .flatMap(async (data) => ({ customer: { ...data } })) // Correctly using flatMap with async function
      .yield();

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      // Expecting the actual transformed data, not a Promise
      expect(result.value).toEqual({ customer: { name: "Alice", age: 30 } });
    }
  });

  it("does not apply map function after a Failure", async () => {
    const badRequest: RequestType = { name: "" }; // This will cause a failure in verifyInput

    const result = await Monad.of<RequestType>(badRequest)
      .flatMap(verifyInput) // This should fail
      .map((data) => ({ customer: { ...data, added: true } })) // This should not be applied
      .yield();

    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("Invalid input");
      expect((result as any).value).toBeUndefined(); // Ensure that map didn't transform the Failure
    }
  });

  it("recovers from Failure with a default value", async () => {
    const badRequest: RequestType = { name: "" };

    const result = await Monad.of<RequestType>(badRequest)
      .flatMap(verifyInput)
      .recover((_) => ({ name: "Default Name" })) // Recovering from Failure
      .yield();

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ name: "Default Name" });
    }
  });
};

const advancedMonadTests = () => {
  it("handles nested monads correctly", async () => {
    const request: RequestType = { name: "Alice" };

    const nestedMonad = (data: VerifiedRequestType) => Monad.of({ ...data, age: 30 });

    const result = await Monad.of(request)
      .flatMap(verifyInput)
      .flatMap(nestedMonad) // This returns a Monad
      .yield();

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ name: "Alice", age: 30 });
    }
  });

  it("propagates Failure after map operation", async () => {
    const badRequest: RequestType = { name: "Alice" }; // This will pass the verification

    const result = await Monad.of<RequestType>(badRequest)
      .flatMap(verifyInput) // This should pass
      .map((data) => ({ ...data, modified: true })) // This should be applied
      .flatMap(asyncFetchAdditionalDataWithError) // This should fail
      .yield();

    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("Async error");
    }
  });

  it("handles errors thrown in map function", async () => {
    const request: RequestType = { name: "Alice" };

    const result = await Monad.of<RequestType>(request)
      .flatMap(verifyInput)
      .map((data) => {
        if (request.name === "Alice") throw new Error("Error in map"); // Throwing an error in map
        return data;
      })
      .yield();

    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("Error in map");
    }
  });

  it("applies match condition correctly", async () => {
    const request: RequestType = { name: "Alice" };
    const matches = generateMatches({
      names: ["Alice", "Bob"],
      matched: [true, true],
    });
    const result = await Monad.of<RequestType>(request).flatMap(verifyInput).match(matches).yield();
    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ name: "Alice", matched: true });
    }
  });

  it("returns Failure if no match conditions are met", async () => {
    const request: RequestType = { name: "Charlie" };
    const matches = generateMatches({
      names: ["Alice", "Bob"],
      matched: [true, true],
    });
    const result = await Monad.of<RequestType>(request).flatMap(verifyInput).match(matches).yield();

    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("No conditions matched");
    }
  });

  it("continues if no match conditions are met and option is set", async () => {
    const request: RequestType = { name: "Charlie" };
    const matches = generateMatches({
      names: ["Alice", "Bob"],
      matched: [true, true],
    });
    const result = await Monad.of<RequestType>(request)
      .flatMap(verifyInput)
      .match(matches, { continueIfNoMatch: true })
      .yield();

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ name: "Charlie" }); // Original value
    }
  });

  it("returns a Failure if no conditions match and continueIfNoMatch is false", async () => {
    const matches = generateMatches({ names: ["Bob"], matched: [false] });
    const request: RequestType = { name: "Alice" };

    const result = await Monad.of<RequestType>(request)
      .flatMap(verifyInput)
      .match(matches) // Default is continueIfNoMatch=false
      .yield();

    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("No conditions matched");
    }
  });

  it("returns a Failure if no conditions match and continueIfNoMatch is false", async () => {
    const matches = generateMatches({ names: ["Bob"], matched: [false] });
    const request: RequestType = { name: "Alice" };

    const result = await Monad.of<RequestType>(request)
      .flatMap(verifyInput)
      .match(matches) // Default is continueIfNoMatch=false
      .yield();

    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("No conditions matched");
    }
  });

  it("handles errors thrown within the action of a match condition", async () => {
    const request: RequestType = { name: "Alice" };

    const matches = [
      {
        condition: (value: VerifiedRequestType) => value.name === "Alice",
        action: (value: VerifiedRequestType) => {
          throw new Error("Error in action");
        },
      },
    ];

    const result = await Monad.of<RequestType>(request).flatMap(verifyInput).match(matches).yield();

    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("Error in action");
    }
  });

  it("handles errors thrown within the action of a match condition and continues on error", async () => {
    const request: RequestType = { name: "Alice" };
    const matches = [
      {
        condition: (value: VerifiedRequestType) => value.name === "Alice",
        action: (value: VerifiedRequestType) => {
          throw new Error("Error in action");
        },
      },
    ];
    const result = await Monad.of<RequestType>(request)
      .flatMap(verifyInput)
      .match(matches, { continueOnError: true })
      .yield();
    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ name: "Alice" });
    }
  });

  it("handles asynchronous actions within the match condition", async () => {
    const request: RequestType = { name: "Alice" };

    const matches: MatchCondition<VerifiedRequestType, Error>[] = [
      {
        condition: (value: VerifiedRequestType) => value.name === "Alice",
        action: async (_: VerifiedRequestType): Promise<VerifiedRequestType> => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ name: "Alice", async: true });
            }, 50);
          });
        },
      },
    ];

    const result = await Monad.of<RequestType>(request).flatMap(verifyInput).match(matches).yield();

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ name: "Alice", async: true });
    }
  });

  it("handles a mix of asynchronous and synchronous actions within the match conditions", async () => {
    const request: RequestType = { name: "Alice" };

    const matches: MatchCondition<VerifiedRequestType, Error>[] = [
      {
        condition: (value: VerifiedRequestType) => value.name === "Alice",
        action: async (value: VerifiedRequestType): Promise<VerifiedRequestType> => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ name: "Alice", async: true });
            }, 50);
          });
        },
      },
      {
        condition: (value: VerifiedRequestType) => value.name === "Alice",
        action: (value: VerifiedRequestType): VerifiedRequestType => {
          return { name: "Alice", async: false };
        },
      },
    ];

    const result = await Monad.of<RequestType>(request).flatMap(verifyInput).match(matches).yield();

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value).toEqual({ name: "Alice", async: true }); // The async action should take precedence because of the FIRST mode
    }
  });

  it("handles rejected promises within the match conditions", async () => {
    const request: RequestType = { name: "Alice" };
    const matches: MatchCondition<VerifiedRequestType, Error>[] = [
      {
        condition: (value: VerifiedRequestType) => value.name === "Alice",
        action: async (value: VerifiedRequestType): Promise<VerifiedRequestType> => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error("Action rejected"));
            }, 50);
          });
        },
      },
    ];
    const result = await Monad.of<RequestType>(request).flatMap(verifyInput).match(matches).yield();
    expect(result.isSuccess()).toBe(false);
    if (!result.isSuccess()) {
      expect(result.error).toBe("Action rejected");
    }
  });

  describe("Zip Function", () => {
    // Test with both monads succeeding
    it("combines the result of two successful monads", async () => {
      const monad1 = {
        monad: Monad.of<{ name: string }>({ name: "Alice" }),
        name: "someMonad",
      };
      const monad2 = { monad: Monad.of<number>(30) };

      const combined = Monad.zip(monad1, monad2);
      const result = await combined.yield();

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({ someMonad: { name: "Alice" }, m1: 30 });
      }
    });

    it("returns the first error if both monads fail", async () => {
      // Corrected the structure of the monads being passed
      const monad1 = {
        monad: Monad.fail<{ name: string }, string>("First error"),
      };
      const monad2 = { monad: Monad.fail<number, string>("Second error") };
      const combined = Monad.zip(monad1, monad2); // Corrected the function call
      const result = await combined.yield();

      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error).toBe("First error");
      }
    });

    it("combines the result of two successful monads with custom names", async () => {
      // Corrected the structure of the monads being passed
      const monad1 = {
        monad: Monad.of<{ name: string }>({ name: "Alice" }),
        name: "someMonad",
      };
      const monad2 = { monad: Monad.of<number>(30), name: "otherMonad" };
      const combined = Monad.zip(monad1, monad2); // Corrected the function call
      const result = await combined.yield();

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({
          someMonad: { name: "Alice" },
          otherMonad: 30,
        });
      }
    });

    it("combines the result of multiple monads", async () => {
      const monad1 = {
        monad: Monad.of<{ name: string }>({ name: "Alice" }),
        name: "someMonad",
      };
      const monad2 = { monad: Monad.of<number>(30) };
      const monad3 = { monad: Monad.of<boolean>(true), name: "booleanMonad" };

      const combined = Monad.zip([monad1, monad2, monad3]);
      const result = await combined.yield();

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual({
          someMonad: { name: "Alice" },
          m1: 30,
          booleanMonad: true,
        });
      }
    });

    it("combines the result of multiple monads where one fails", async () => {
      const monad1 = {
        monad: Monad.of<{ name: string }>({ name: "Alice" }),
        name: "someMonad",
      };
      const monad2 = { monad: Monad.of<number>(30) };
      const monad3 = {
        monad: Monad.fail<number, Error>(new Error("Something")),
        name: "booleanMonad",
      };
      const combined = Monad.zip([monad1, monad2, monad3]);
      const result = await combined.yield();

      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error).toEqual(new Error("Something"));
      }
    });
  });

  describe("Filter Function", () => {
    it("returns the value when the predicate is satisfied", async () => {
      const monad = Monad.of<number>(5);
      const filtered = monad.filter((value) => value > 0);
      const result = await filtered.yield();

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(5);
      }
    });

    it("returns default error when the predicate is not satisfied", async () => {
      const monad = Monad.of<number>(-5);
      const filtered = monad.filter((value) => value > 0);
      const result = await filtered.yield();

      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error).toBe("Value did not satisfy the predicate");
      }
    });

    it("returns custom error when the predicate is not satisfied", async () => {
      const monad = Monad.of<number>(-5);
      const filtered = monad.filter(
        (value) => value > 0,
        () => "Custom Error",
      );
      const result = await filtered.yield();

      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error).toBe("Custom Error");
      }
    });

    it("preserves the original error if the monad is a failure", async () => {
      const monad = Monad.fail<number, string>("Original Error");
      const filtered = monad.filter(
        (value) => value > 0,
        () => "Custom Error",
      );
      const result = await filtered.yield();

      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error).toBe("Original Error");
      }
    });

    it("works with complex objects", async () => {
      const monad = Monad.of<{ name: string; age: number }>({
        name: "Alice",
        age: 30,
      }).filter((value) => value.age >= 18);

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value.age).toBe(30);
      }
    });

    it("filters an array", async () => {
      const monad = Monad.of<number[]>([1, 2, 3, 4, 5]).filter((value) => value.includes(3));

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toEqual([1, 2, 3, 4, 5]);
      }
    });

    it("returns a custom error when the predicate is false", async () => {
      const monad = Monad.of<number>(15).filter(
        (value) => value >= 18,
        () => "Not an adult",
      );

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error).toBe("Not an adult");
      }
    });

    it("supports nested filters", async () => {
      const monad = Monad.of<number>(20)
        .filter((value) => value >= 10)
        .filter((value) => value <= 30);

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(20);
      }
    });

    it("supports async predicates", async () => {
      const monad = Monad.of<number>(10).filter(async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return value >= 10;
      });

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(true);
    });

    it("transitions to Failure if async predicate rejects", async () => {
      const monad = Monad.of<number>(10).filter(
        async (value) => {
          await new Promise((_, reject) => setTimeout(() => reject(new Error("Predicate Error")), 20));
          return value >= 10;
        },
        () => "Predicate Failed",
      );
      const result = await monad.yield();
      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error).toBe("Predicate Failed");
      }
    });
  });

  describe("Tap function", () => {
    it("calls the tap function when the monad is in success state", async () => {
      let tapCalled = false;
      const monad = Monad.of<string>("Hello").tap((value) => {
        tapCalled = true;
        expect(value).toBe("Hello");
      });

      await monad.yield();
      expect(tapCalled).toBe(true);
    });

    it("does not change the monad state", async () => {
      const monad = Monad.of<number>(42).tap((value) => value * 2);

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(42); // Not 84, proving that monad state is immutable
      }
    });

    it("does not call the tap function when the monad is in failure state", async () => {
      let tapCalled = false;
      const monad = Monad.fail<string, string>("Error").tap((value) => {
        tapCalled = true;
      });

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(false);
      expect(tapCalled).toBe(false);
    });

    describe("tap function with async operations", () => {
      it("calls the async tap function when the monad is in success state", async () => {
        let tapCalled = false;
        const monad = Monad.of<string>("Hello").tap(async (value) => {
          await new Promise((res) => setTimeout(res, 100)); // simulate async operation
          tapCalled = true;
          expect(value).toBe("Hello");
        });

        await monad.yield();
        expect(tapCalled).toBe(true); // This should now pass
      });

      it("handles rejection in async tap function gracefully", async () => {
        let errorCaught = "";
        const monad = Monad.of<number>(42).tap(async (value) => {
          try {
            await new Promise((_, rej) => setTimeout(() => rej("Async Error"), 100)); // simulate async rejection
          } catch (error) {
            errorCaught = error;
          }
        });

        const result = await monad.yield();
        expect(result.isSuccess()).toBe(true);
        if (result.isSuccess()) {
          expect(result.value).toBe(42);
        }
        expect(errorCaught).toBe("Async Error"); // This should now pass
      });
    });
  });

  describe("Monad toPromise", () => {
    it("converts a successful monad to a resolved promise", async () => {
      const monad = Monad.of(42);
      await expect(monad.toPromise()).resolves.toBe(42);
    });

    it("converts a failed monad to a rejected promise", async () => {
      const error = new Error("An error occurred");
      const monad = Monad.fail<number, Error>(error);
      await expect(monad.toPromise()).rejects.toThrow(error);
    });

    it("the value in the resolved promise matches the monad’s value", async () => {
      const value = { name: "Alice", age: 30 };
      const monad = Monad.of(value);
      const result = await monad.toPromise();
      expect(result).toEqual(value);
    });
  });

  describe("Monad fromPromise", () => {
    it("should handle a resolved promise", async () => {
      const promise = Promise.resolve(42);
      const monad = Monad.fromPromise(promise);

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(42);
      }
    });

    it("should handle a rejected promise", async () => {
      const promise = Promise.reject(new Error("Promise Error"));
      const monad = Monad.fromPromise(promise);

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error.message).toBe("Promise Error");
      }
    });

    it("should be able to transform a resolved promise value", async () => {
      const promise = Promise.resolve(42);
      const monad = Monad.fromPromise(promise).map((value) => value * 2);

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(84);
      }
    });

    it("should not transform a rejected promise value", async () => {
      const promise = Promise.reject(new Error("Promise Error"));
      const monad = Monad.fromPromise(promise).map((value) => value * 2);

      const result = await monad.yield();
      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error.message).toBe("Promise Error");
      }
    });
  });

  describe("Retry function", () => {
    it("retries upon failure and eventually succeeds", async () => {
      let attemptCounter = 0;

      const operationFn = () =>
        Monad.of<number>(0).map((value) => {
          attemptCounter += 1;

          if (attemptCounter < 3) {
            throw new Error("Failed");
          }

          return attemptCounter;
        });

      const result = await Monad.retry(operationFn, {
        times: 5,
        delay: 10,
        onError: (error, attempt) => {},
      }).yield();

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(3); // The operation succeeds on the 3rd attempt
      }
    });
    it("increases delay between retries with backoff factor", async () => {
      let attemptCounter = 0;
      let lastAttemptTime = Date.now();

      const operationFn = () =>
        Monad.of<number>(0).map((value) => {
          const currentAttemptTime = Date.now();
          attemptCounter += 1;

          if (attemptCounter > 1) {
            const timeElapsed = currentAttemptTime - lastAttemptTime;

            expect(timeElapsed).toBeGreaterThanOrEqual(10 * attemptCounter);
          }

          lastAttemptTime = currentAttemptTime;

          if (attemptCounter < 5) {
            throw new Error("Failed");
          }

          return attemptCounter;
        });

      const result = await Monad.retry(operationFn, {
        times: 5,
        delay: 10,
        backoffFactor: 2,
      }).yield();

      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(5);
      }
    });

    it("gives up after the maximum number of retries", async () => {
      let attemptCounter = 0;

      const operationFn = () =>
        Monad.of<number>(0).map((value) => {
          attemptCounter += 1;
          throw new Error("Failed");
        });

      const result = await Monad.retry(operationFn, {
        times: 3,
        delay: 10,
      }).yield();

      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(attemptCounter).toBe(3 + 1);
      }
    });

    it("calls onError callback on each failure", async () => {
      let attemptCounter = 0;
      let errorCounter = 0;

      const operationFn = () =>
        Monad.of<number>(0).map((value) => {
          attemptCounter += 1;
          throw new Error("Failed");
        });
      const result = await Monad.retry(operationFn, {
        times: 5,
        delay: 10,
        onError: (error, attempt) => {
          errorCounter += 1;
          expect(error).toBe("Failed");
        },
      }).yield();

      expect(result.isSuccess()).toBe(false);
      expect(errorCounter).toBe(5);
    });
  });

  describe("TimeOut function", () => {
    it("completes successfully before timeout", async () => {
      const operation = (signal?: AbortSignal) => Monad.of<number>(42);
      const result = await Monad.timeout(operation, 50, new Error("Operation timed out")).yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(42);
      }
    });

    it("fails due to timeout", async () => {
      const operation = (signal?: AbortSignal) =>
        new Monad<number>(new Promise((resolve) => setTimeout(() => resolve(new Success(42)), 100)));
      const result = await Monad.timeout(operation, 50, new Error("Operation timed out")).yield();
      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error.message).toBe("Operation timed out");
      }
    });

    it("aborts the ongoing operation", async () => {
      const operation = (signal?: AbortSignal) =>
        new Monad<number>(
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve(new Success(42)), 100);
            if (signal) {
              signal.addEventListener("abort", () => {
                clearTimeout(timer);
                reject(new Error("Operation aborted"));
              });
            }
          }),
        );
      const result = await Monad.timeout(operation, 50, new Error("Operation timed out")).yield();
      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error.message).toBe("Operation timed out");
      }
    });

    it("handles operations that don't support aborting", async () => {
      // Simulating an operation that doesn't support aborting by ignoring the abort signal
      const operation = (signal?: AbortSignal) =>
        new Monad<number>(
          new Promise((resolve) => {
            const timer = setTimeout(() => resolve(new Success(42)), 100);
            if (signal) {
              signal.addEventListener("abort", () => {
                clearTimeout(timer);
                resolve(new Failure(new Error("Operation aborted")));
              });
            }
          }),
        );
      const result = await Monad.timeout(operation, 50, new Error("Operation timed out")).yield();
      expect(result.isSuccess()).toBe(false);

      if (!result.isSuccess()) {
        expect(result.error.message).toBe("Operation timed out");
      }
    });
  });

  describe("Fold function", () => {
    it("should handle success case with fold", async () => {
      const monad = Monad.of<number>(42);
      const { result, error } = await monad.fold(
        (value) => `Success: ${value}`,
        (error) => `Error: ${error.message}`,
      );
      expect(result).toBe("Success: 42");
      expect(error).toBeUndefined();
    });

    it("should handle error case with fold", async () => {
      const monad = Monad.fail<number, Error>(new Error("Something went wrong"));
      const { result, error } = await monad.fold(
        (value) => `Success: ${value}`,
        (error) => `Error: ${error.message}`,
      );
      expect(result).toBe("Error: Something went wrong");
      expect(error).toBeUndefined();
    });

    it("should handle exception thrown in onSuccess", async () => {
      const monad = Monad.of<number>(42);
      const { result, error } = await monad.fold(
        (_) => {
          throw new Error("Failed in onSuccess");
        },
        (error) => `Error: ${error.message}`,
      );
      expect(result).toBeUndefined();
      expect(error).toBeDefined();
      expect(error!.message).toBe("Failed in onSuccess");
    });
  });

  describe("orElse function", () => {
    it("should return the original monad if it is successful", async () => {
      const monad = Monad.of(5);
      const alternativeMonad = monad.orElse(Monad.of(10));

      const result = await alternativeMonad.yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(5);
      }
    });

    it("should return the alternative monad if the original monad fails", async () => {
      const monad = Monad.fail<number, Error>(new Error("Original Error"));
      const alternativeMonad = monad.orElse(Monad.of(10));

      const result = await alternativeMonad.yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(10);
      }
    });

    it("should accept a function to generate an alternative monad dynamically", async () => {
      const monad = Monad.fail<number, Error>(new Error("Original Error"));
      const alternativeMonad = monad.orElse((error) => {
        expect(error.message).toBe("Original Error");
        return Monad.of(15);
      });

      const result = await alternativeMonad.yield();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe(15);
      }
    });

    it("should propagate the error if the alternative monad also fails", async () => {
      const monad = Monad.fail<number, Error>(new Error("Original Error"));
      const alternativeMonad = monad.orElse(Monad.fail(new Error("Alternative Error")));

      const result = await alternativeMonad.yield();
      expect(result.isSuccess()).toBe(false);
      if (!result.isSuccess()) {
        expect(result.error.message).toBe("Alternative Error");
      }
    });
  });

  describe("Log function", () => {
    it("should log the value if the monad is successful with default transformer", async () => {
      const logger = { log: jest.fn() };
      const monad = Monad.of(5).log(logger); // Not passing transformer
      await monad.yield();
      expect(logger.log).toHaveBeenCalledWith("Success: 5");
    });
    it("should use a custom logger to log the value", async () => {
      const customLogger = {
        log: jest.fn(),
      };

      const monad = Monad.of(10).log(customLogger);

      await monad.yield();
      expect(customLogger.log).toHaveBeenCalledWith("Success: 10");
    });
    it("should apply a custom transformer to the log message", async () => {
      const logger = { log: jest.fn() };
      const transformer = (either: Either<number, Error>) =>
        either.isSuccess() ? `Value is: ${either.value}` : `Oops: ${either.error}`;

      const monad = Monad.of(15).log(logger, transformer);

      await monad.yield();
      expect(logger.log).toHaveBeenCalledWith("Value is: 15");
    });
    it("should log the error if the monad is a failure", async () => {
      const logger = { log: jest.fn() };

      const monad = Monad.fail<number, Error>(new Error("Something went wrong")).log(logger);

      await monad.yield();
      expect(logger.log).toHaveBeenCalledWith("Error: Error: Something went wrong");
    });
    it("should apply a custom transformer to the error log message", async () => {
      const logger = { log: jest.fn() };
      const transformer = (either: Either<number, Error>) =>
        either.isSuccess() ? `Value: ${either.value}` : `Error occurred: ${either.error?.message}`;

      const monad = Monad.fail<number, Error>(new Error("Bad data")).log(logger, transformer);

      await monad.yield();
      expect(logger.log).toHaveBeenCalledWith("Error occurred: Bad data");
    });
  });

  describe("timeExecution", () => {
    it("logs the execution time of a successful operation", async () => {
      let logMessage = "";
      const logger = { log: (message: string) => (logMessage = message) };
      const operation = () => Monad.of(42).map((value) => value * 2);

      const result = await Monad.timeExecution(operation, logger);

      expect(result.isSuccess()).toBe(true);
      expect(logMessage).toMatch(/Execution took \d+(\.\d+)?ms/);
    });

    it("uses a custom logger", async () => {
      let customLogCalled = false;
      const customLogger = {
        log: (message: string) => (customLogCalled = true),
      };
      const operation = () => Monad.of(42);

      await Monad.timeExecution(operation, customLogger);

      expect(customLogCalled).toBe(true);
    });

    it("applies a custom transformer to the log message", async () => {
      let logMessage = "";
      const logger = { log: (message: string) => (logMessage = message) };
      const operation = () => Monad.of(42);
      const transformer = (duration: number, result: Either<number, Error>) =>
        `Custom log: ${result.isSuccess() ? "Success" : "Failure"} in ${duration}ms`;

      await Monad.timeExecution(operation, logger, transformer);

      expect(logMessage).toMatch(/^Custom log: Success in \d+(\.\d+)?ms$/);
    });

    it("handles the failure scenario", async () => {
      let logMessage = "";
      const logger = { log: (message: string) => (logMessage = message) };
      const operation = () => Monad.fail<number, Error>(new Error("Oops"));

      const result = await Monad.timeExecution(operation, logger);

      expect(!result.isSuccess()).toBe(true);
      expect(logMessage).toMatch(/Execution took \d+(\.\d+)?ms/);
      expect(logMessage).toContain("Error: Oops"); // if error is included in the log message by default
    });
  });

  describe("Enhanced Error Types", () => {
    
    
    it("handles specific errors with the provided handler", async () => {
      const operation = Monad.fail(new BadRequestError("Bad Request"));
      const handler = jest.fn((error) => Monad.of(error.message));

      const result = await operation.handleSpecificErrors([BadRequestError, GatewayError], handler).yield();

      expect(handler).toHaveBeenCalled();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe("Bad Request");
      }
    });

    it("does not handle non-specified errors", async () => {
      const operation = Monad.fail(new OtherError("Other Error"));
      const handler = jest.fn((error) => Monad.of(error.message));

      await operation.handleSpecificErrors([BadRequestError, GatewayError], handler).yield();
      expect(handler).not.toHaveBeenCalled();
    });

    it('handles specific HTTP errors with the provided handler', async () => {
      const operation = Monad.fail(new HttpError(400, 'Bad Request'));
      const handler = jest.fn((error: HttpError) => Monad.of<unknown, HttpError>(error.message));
  
      const result = await operation
          .handleHttpErrors([400, 404], handler)
          .yield();
  
      expect(handler).toHaveBeenCalled();
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.value).toBe('Bad Request');
      }
  });
  
  it('does not handle non-specified HTTP errors', async () => {
      const operation = Monad.fail(new HttpError(500, 'Server Error'));
      const handler = jest.fn((error) => Monad.of<unknown, HttpError>('handled'));
  
      await operation
          .handleHttpErrors([400, 404], handler)
          .yield();
  
      expect(handler).not.toHaveBeenCalled();
  });
  });
};

describe("Monad Class Tests", () => {
  describe("Mock Input Tests", mockInputTests);
  describe("Basic Monad Tests", basicMonadTests);
  describe("Advanced Monad Tests", advancedMonadTests);
});

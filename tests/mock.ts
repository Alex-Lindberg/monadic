/* eslint-disable */
import axios from 'axios';
export type RequestType = {
  name: string;
  async?: boolean;
};

export type VerifiedRequestType = {
  name: string;
  async?: boolean;
};

export type WithAdditionalDataType = {
  name: string;
  age: number;
  async?: boolean;
};

export type RemappedType = {
  customer: { name: string; age: number };
  async?: boolean;
};

export const verifyInput = (request: RequestType): VerifiedRequestType => {
  if (request.name) {
    return { name: request.name, async: request?.async };
  }
  throw new Error("Invalid input");
};
export const asyncFetchAdditionalData = (
  verifiedRequest: VerifiedRequestType,
  options?: { age: number },
): Promise<WithAdditionalDataType> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ...verifiedRequest, age: options?.age ?? 30 });
    }, 50);
  });
};
export const asyncFetchAdditionalDataWithError = (
  _1: VerifiedRequestType,
  _2?: { age: number },
): Promise<WithAdditionalDataType> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject("Async error");
    }, 50);
  });
};

export const remapData = (data: WithAdditionalDataType): RemappedType => {
  return { customer: { name: data.name, age: data.age } };
};

export const generateMatches = (ms: { names: string[]; matched: boolean[]; age?: number[] }): any => {
  return ms.names!.map((name, i) => ({
    condition: (value: VerifiedRequestType) => value!.name === name,
    action: (value: VerifiedRequestType) => ({
      name,
      matched: ms!.matched[i],
      age: ms.age ? ms.age[i] : undefined,
    }),
  }));
};

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
  }
}
export class GatewayError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class OtherError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const errorHandler = (error: Error): void => {
  console.error(error.message);
};


export async function* paginatedFetch(url: string, pages: number): AsyncIterable<any[]> {
  for (let i = 1; i <= pages; i++) {
    try {
      const response = await axios.get(`${url}?page=${i}`);
      yield response.data;
    } catch (error) {
      throw new Error(`Failed to fetch page ${i}: ${error.message}`);
    }
  }
}


// axios HttpStatusCode와 같은 이름과 값을 쓰는 상태 코드 상수
export const HttpStatus = {
  Ok: 200,
  Created: 201,
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  PayloadTooLarge: 413,
  UnsupportedMediaType: 415,
  InternalServerError: 500,
} as const;

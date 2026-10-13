import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/portfolio";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL이 설정되지 않음");
  return drizzle(neon(url), { schema });
}

let instance: Db | undefined;

// import 시점이 아닌 첫 사용 시점에 연결을 만드는 지연 초기화
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    instance ??= createDb();
    return Reflect.get(instance, prop, receiver);
  },
});

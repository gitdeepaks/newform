import { db, eq } from "@repo/database";
import { createHmac, randomBytes } from "node:crypto";
import { usersTable } from "@repo/database/schema";
import {
  createUserWithEmailAndPasswordInputSchema,
  CreateUserWithEmailAndPasswordInputSchemaType,
  generateUserTokenPayload,
  signInUserWithEmailAndPasswordInputSchema,
  type GenerateUserTokenPayloadType,
  type SignInUserWithEmailAndPasswordInputSchemaType,
} from "./model";
import * as JWT from "jsonwebtoken";
import { env } from "../env";

class UserService {
  private async getUserByEmail(email: string) {
    const result = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!result || result.length === 0) {
      return null;
    }
    return result[0];
  }

  private verifyUserToken(token: string): GenerateUserTokenPayloadType {
    try {
      const decoded = JWT.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });

      if (typeof decoded === "string") {
        throw new Error("Invalid token");
      }

      const parsed = generateUserTokenPayload.safeParse(decoded);
      if (!parsed.success) {
        throw new Error("Invalid token");
      }

      return parsed.data;
    } catch {
      throw new Error(`Invalid token`);
    }
  }

  public async getUserInfoById(id: string) {
    const user = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user || user.length === 0 || !user[0]) {
      throw new Error(`User With ${id} Not Found`);
    }
    const { profileImageUrl, ...rest } = user[0];
    return { ...rest, profileImageUrl: profileImageUrl ?? undefined };
  }
  private async generateUserToken(payload: GenerateUserTokenPayloadType) {
    const { id } = await generateUserTokenPayload.parseAsync(payload);
    const token = JWT.sign({ id }, env.JWT_SECRET, { algorithm: "HS256" });
    return { token };
  }

  private async generateHashPassword(password: string, salt: string) {
    return createHmac("sha256", salt).update(password).digest("hex");
  }

  public async createUserWithEmailAndPassword(
    input: CreateUserWithEmailAndPasswordInputSchemaType,
  ) {
    const { email, password, fullName } =
      await createUserWithEmailAndPasswordInputSchema.parseAsync(input);

    // check if user already exists

    const existingUserWithEmail = await this.getUserByEmail(email);

    if (existingUserWithEmail) throw new Error("User With Email Already Exists");
    // calculate salt and hash
    const salt = randomBytes(16).toString("hex");
    const hash = await this.generateHashPassword(password, salt);

    // Create user in database
    const userInsertResult = await db
      .insert(usersTable)
      .values({
        email,
        fullName,
        password: hash,
        salt,
      })
      .returning({
        id: usersTable.id,
      });
    if (!userInsertResult || userInsertResult.length === 0 || !userInsertResult[0]?.id) {
      throw new Error("Failed to create user");
    }
    const userId = userInsertResult[0].id;
    const { token } = await this.generateUserToken({ id: userId });
    return {
      id: userId,
      token,
    };
  }

  public async singnInUserWithEmailAndPassword(
    payload: SignInUserWithEmailAndPasswordInputSchemaType,
  ) {
    const { email, password } = await signInUserWithEmailAndPasswordInputSchema.parseAsync(payload);

    // check if user exists
    const existingUser = await this.getUserByEmail(email);
    if (!existingUser) throw new Error(`User With ${email} Not Found`);

    if (!existingUser.password || !existingUser.salt)
      throw new Error("Invalid authentication method");

    const hash = await this.generateHashPassword(password, existingUser.salt);

    if (hash !== existingUser.password) throw new Error("Invalid Email Or Password");

    const { token } = await this.generateUserToken({ id: existingUser.id });

    return {
      id: existingUser.id,
      token,
    };
  }

  public async verifyAndDecodeuserToken(token: string) {
    const { id } = await this.verifyUserToken(token);
    return { id };
  }
}

export default UserService;

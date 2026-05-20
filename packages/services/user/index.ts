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

  private async generateUserToken(payload: GenerateUserTokenPayloadType) {
    const { id } = await generateUserTokenPayload.parseAsync(payload);
    const token = JWT.sign({ id }, env.JWT_SECRET);
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
}

export default UserService;

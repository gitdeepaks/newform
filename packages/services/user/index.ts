import { and, db, eq } from "@repo/database";
import { createHmac, randomBytes } from "node:crypto";
import { userAccountsTable, usersTable } from "@repo/database/schema";
import {
  createUserWithEmailAndPasswordInputSchema,
  CreateUserWithEmailAndPasswordInputSchemaType,
  findOrCreateOAuthUserInputSchema,
  type FindOrCreateOAuthUserInput,
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

  private async getOAuthAccount(provider: string, providerAccountId: string) {
    const result = await db
      .select()
      .from(userAccountsTable)
      .where(
        and(
          eq(userAccountsTable.provider, provider),
          eq(userAccountsTable.providerAccountId, providerAccountId),
        ),
      );

    return result[0] ?? null;
  }

  private async getUserById(id: string) {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return result[0] ?? null;
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

  public async findOrCreateOAuthUser(input: FindOrCreateOAuthUserInput) {
    const profile = await findOrCreateOAuthUserInputSchema.parseAsync(input);

    if (!profile.emailVerified) {
      throw new Error("OAuth email must be verified");
    }

    const existingAccount = await this.getOAuthAccount(
      profile.provider,
      profile.providerAccountId,
    );

    if (existingAccount) {
      const linkedUser = await this.getUserById(existingAccount.userId);
      if (!linkedUser) {
        throw new Error("Linked OAuth user does not exist");
      }

      const { token } = await this.generateUserToken({ id: linkedUser.id });
      return { id: linkedUser.id, token };
    }

    const userId = await db.transaction(async (tx) => {
      const existingUser = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, profile.email));

      const user = existingUser[0];

      if (user) {
        await tx
          .insert(userAccountsTable)
          .values({
            userId: user.id,
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
          });

        await tx
          .update(usersTable)
          .set({
            emailVerified: true,
            profileImageUrl: user.profileImageUrl ?? profile.profileImageUrl,
          })
          .where(eq(usersTable.id, user.id));

        return user.id;
      }

      const createdUser = await tx
        .insert(usersTable)
        .values({
          email: profile.email,
          fullName: profile.fullName,
          emailVerified: true,
          profileImageUrl: profile.profileImageUrl,
        })
        .returning({ id: usersTable.id });

      const createdUserId = createdUser[0]?.id;
      if (!createdUserId) {
        throw new Error("Failed to create OAuth user");
      }

      await tx.insert(userAccountsTable).values({
        userId: createdUserId,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      });

      return createdUserId;
    });

    const { token } = await this.generateUserToken({ id: userId });
    return { id: userId, token };
  }

  public async verifyAndDecodeuserToken(token: string) {
    const { id } = await this.verifyUserToken(token);
    return { id };
  }
}

export default UserService;

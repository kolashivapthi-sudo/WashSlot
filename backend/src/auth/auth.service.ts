import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';

// Only hostlers with this domain can self-register as USER
const ALLOWED_USER_DOMAIN = 'bvrithyderabad.edu.in';
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Register (hostlers only) ─────────────────────────────────────────────

  async register(dto: RegisterDto) {
    // Validate college email domain
    const emailDomain = dto.email.split('@')[1]?.toLowerCase();
    if (emailDomain !== ALLOWED_USER_DOMAIN) {
      throw new BadRequestException(
        `Registration requires a college email (@${ALLOWED_USER_DOMAIN}).`,
      );
    }

    // Check duplicate
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name.trim(),
        role: 'USER',
      },
    });

    const token = this.signToken(user.id, user.email, user.role);
    return {
      token,
      user: this.sanitize(user),
      message: 'Account created successfully.',
    };
  }

  // ─── Login (all roles) ────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Use same error for both "not found" and "wrong password" — prevents email enumeration
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const token = this.signToken(user.id, user.email, user.role);
    return {
      token,
      user: this.sanitize(user),
    };
  }

  // ─── Update FCM token (called on app open after login) ───────────────────

  async updateFcmToken(userId: string, dto: UpdateFcmTokenDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: dto.fcmToken },
    });
    return { message: 'FCM token updated.' };
  }

  // ─── Get current user profile ─────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found.');
    return this.sanitize(user);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private signToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }

  private sanitize(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    noShowCount: number;
    createdAt: Date;
    passwordHash?: string;
    fcmToken?: string | null;
  }) {
    // Never return passwordHash or FCM token to client
    const { passwordHash, fcmToken, ...safe } = user;
    return safe;
  }
}

export const BRAND = {
  name: 'Zen Leader',
  adminTitle: 'Zen Leader Admin',
  adminSubtitle: 'Bảng điều khiển quản trị',
  tagline:
    'Nền tảng học tập và cộng đồng — quản lý khóa học, lớp học và người dùng trong một không gian thống nhất.',
  copyright: 'Zen Leader',
  version: 'v0.0.1',
  storageKey: 'zen-leader-admin-auth',
} as const;

/** Tài khoản bootstrap mặc định (khớp backend .env: ADMIN_USER_NAME / ADMIN_PASSWORD) */
export const BOOTSTRAP_ADMIN = {
  email: 'admin@gmail.com',
  password: 'admin123',
} as const;

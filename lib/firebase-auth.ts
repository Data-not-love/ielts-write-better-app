import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth"
import { auth } from "./firebase"

// Auth state is provided by components/auth/auth-provider.tsx (useAuth); these are the actions.

const AUTH_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
  "auth/wrong-password": "Email hoặc mật khẩu không đúng.",
  "auth/user-not-found": "Email hoặc mật khẩu không đúng.",
  "auth/invalid-email": "Email không hợp lệ.",
  "auth/email-already-in-use": "Email này đã được dùng cho một tài khoản khác.",
  "auth/weak-password": "Mật khẩu quá yếu. Hãy dùng ít nhất 6 ký tự.",
  "auth/too-many-requests": "Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.",
  "auth/network-request-failed": "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
  "auth/popup-closed-by-user": "Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.",
  "auth/popup-blocked": "Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép popup rồi thử lại.",
  "auth/unauthorized-domain": "Tên miền này chưa được phép đăng nhập. Vui lòng liên hệ quản trị viên.",
}

/** A message the user can act on, instead of Firebase's "Firebase: Error (auth/...)" text. */
export function authErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : ""
  return AUTH_MESSAGES[code] ?? "Đã có lỗi xảy ra. Vui lòng thử lại."
}

export async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { user: userCredential.user, error: null }
  } catch (error) {
    return { user: null, error: authErrorMessage(error) }
  }
}

export async function signUp(email: string, password: string, name?: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    // Update profile with name if provided
    if (name && userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name })
    }

    return { user: userCredential.user, error: null }
  } catch (error) {
    return { user: null, error: authErrorMessage(error) }
  }
}

export async function signOutUser() {
  try {
    await signOut(auth)
    return { error: null }
  } catch (error) {
    return { error: authErrorMessage(error) }
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email)
    return { error: null }
  } catch (error) {
    return { error: authErrorMessage(error) }
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)
    return { user: userCredential.user, error: null }
  } catch (error) {
    return { user: null, error: authErrorMessage(error) }
  }
}

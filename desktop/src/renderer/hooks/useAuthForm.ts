import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '../stores/toast.store';
import {
  loginSchema,
  registerSchema,
  type LoginFormData,
  type RegisterFormData,
} from '../utils/validation/auth.validation';

export type AuthTab = 'login' | 'register';
type LoginErrors = Partial<Record<keyof LoginFormData, string>>;
type RegisterErrors = Partial<Record<keyof RegisterFormData, string>>;

export function useAuthForm() {
  const [tab, setTab] = useState<AuthTab>('login');

  const [loginData, setLoginData] = useState<LoginFormData>({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});

  const { login, register, isLoading, clearError } = useAuthStore();
  const toast = useToast();
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, [tab]);

  useEffect(() => {
    clearError();
  }, [tab, clearError]);

  function switchTab(next: AuthTab) {
    setTab(next);
    setLoginErrors({});
    setRegisterErrors({});
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const errors: LoginErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormData;
        if (!errors[field]) errors[field] = issue.message;
      }
      setLoginErrors(errors);
      return;
    }
    setLoginErrors({});
    const outcome = await login(result.data.email, result.data.password);
    if (!outcome.success && outcome.error) {
      toast.error(outcome.error);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    const result = registerSchema.safeParse(registerData);
    if (!result.success) {
      const errors: RegisterErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof RegisterFormData;
        if (!errors[field]) errors[field] = issue.message;
      }
      setRegisterErrors(errors);
      return;
    }
    setRegisterErrors({});
    const outcome = await register(result.data.email, result.data.password, result.data.name);
    if (!outcome.success && outcome.error) {
      toast.error(outcome.error);
    }
  }

  return {
    tab,
    switchTab,
    loginData,
    setLoginData,
    loginErrors,
    registerData,
    setRegisterData,
    registerErrors,
    submitLogin,
    submitRegister,
    isLoading,
    emailInputRef,
  };
}

import { SignupForm } from '@/components/auth/SignupForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | LearnUp',
  description: 'Create your LearnUp account',
};

export default function SignupPage() {
  return <SignupForm />;
}

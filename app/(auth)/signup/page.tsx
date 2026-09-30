import { SignupForm } from '@/components/auth/SignupForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | StudyFlow',
  description: 'Create your StudyFlow account',
};

export default function SignupPage() {
  return <SignupForm />;
}

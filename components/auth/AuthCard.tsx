import * as React from "react";
import { Logo } from "@/components/ui/Logo";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/** Habillage commun aux pages /connexion et /inscription. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 sm:px-6">
      <Logo variant="full" size="sm" className="mb-8" />
      <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-sm text-gray-500">{footer}</p>
    </div>
  );
}

/** Champ de formulaire : label, contrôle et message d'erreur associé. */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Bandeau d'erreur global du formulaire. */
export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
    >
      {message}
    </p>
  );
}

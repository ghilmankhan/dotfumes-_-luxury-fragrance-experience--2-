import { useState } from 'react';

import {
  checkoutContract,
  type CheckoutErrors,
  type CheckoutFieldName,
  type CheckoutStepStatus,
} from '../contracts/checkout.contract';
import type { CheckoutFormValues } from '../models/order';

interface UseCheckoutValidationOptions {
  hasItems: boolean;
  hasAvailabilityIssues: boolean;
  isSubmitting: boolean;
}

const validateFieldValue = (
  field: CheckoutFieldName,
  values: CheckoutFormValues,
): string | undefined => {
  const value = values[field];
  const rule = checkoutContract.fields[field];
  const trimmedValue = value.trim();

  if (rule.required && !trimmedValue && 'required' in rule.messages) {
    return rule.messages.required;
  }

  if (
    field === 'email' &&
    trimmedValue &&
    !checkoutContract.fields.email.pattern.test(trimmedValue)
  ) {
    return checkoutContract.fields.email.messages.pattern;
  }

  if (field === 'phone') {
    const normalizedPhone = trimmedValue.replace(/\s+/g, '');
    if (!checkoutContract.fields.phone.pattern.test(normalizedPhone)) {
      return checkoutContract.fields.phone.messages.pattern;
    }
    if (normalizedPhone.replace(/\D/g, '').length < checkoutContract.fields.phone.minDigits) {
      return checkoutContract.fields.phone.messages.minDigits;
    }
  }

  if (field === 'address' && trimmedValue.length < checkoutContract.fields.address.minLength) {
    return checkoutContract.fields.address.messages.minLength;
  }

  if (
    field === 'paymentMethod' &&
    trimmedValue &&
    !checkoutContract.paymentMethods.some((method) => method.value === trimmedValue)
  ) {
    return checkoutContract.fields.paymentMethod.messages.invalid;
  }

  return undefined;
};

const validateSlip = (file: File | null): string | undefined => {
  const { slip } = checkoutContract;

  if (!file) {
    return slip.messages.required;
  }
  if (!slip.accept.includes(file.type as (typeof slip.accept)[number])) {
    return slip.messages.type;
  }
  if (file.size === 0) {
    return slip.messages.empty;
  }
  if (file.size > slip.maxSizeBytes) {
    return slip.messages.size;
  }
  return undefined;
};

const validate = (values: CheckoutFormValues, slipFile: File | null) => {
  const errors: CheckoutErrors = {};

  for (const field of Object.keys(checkoutContract.fields) as CheckoutFieldName[]) {
    const error = validateFieldValue(field, values);
    if (error) {
      errors[field] = error;
    }
  }

  const slipError = validateSlip(slipFile);
  if (slipError) {
    errors.slip = slipError;
  }

  return errors;
};

export const useCheckoutValidation = ({
  hasItems,
  hasAvailabilityIssues,
  isSubmitting,
}: UseCheckoutValidationOptions) => {
  const [values, setValues] = useState<CheckoutFormValues>(checkoutContract.initialValues);
  const [slipFile, setSlipFileState] = useState<File | null>(null);
  const [errors, setErrors] = useState<CheckoutErrors>({});

  const currentErrors = validate(values, slipFile);
  const isValid = Object.keys(currentErrors).length === 0;
  const { submission } = checkoutContract;
  const canSubmit =
    (!submission.requiresValidForm || isValid) &&
    (!submission.requiresCartItems || hasItems) &&
    (!submission.requiresAvailableStock || !hasAvailabilityIssues) &&
    !isSubmitting;

  const stepStatus = checkoutContract.steps.reduce<CheckoutStepStatus>(
    (status, step) => {
      status[step.id] = step.fields.every((field) => {
        if (field === 'slip') {
          return !currentErrors.slip;
        }
        return !currentErrors[field];
      });
      return status;
    },
    { details: false, payment: false },
  );

  const setError = (field: keyof CheckoutErrors, message?: string) => {
    setErrors((previous) => {
      const next = { ...previous };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const setField = (field: CheckoutFieldName, value: string) => {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    setError(field, validateFieldValue(field, nextValues));
  };

  const validateField = (field: CheckoutFieldName) => {
    setError(field, validateFieldValue(field, values));
  };

  const setSlipFile = (file: File | null) => {
    setSlipFileState(file);
    setError('slip', validateSlip(file));
  };

  const validateSlipFile = () => {
    setError('slip', validateSlip(slipFile));
  };

  const validateAll = () => {
    const nextErrors = validate(values, slipFile);
    setErrors(nextErrors);
    return nextErrors;
  };

  return {
    values,
    slipFile,
    errors,
    isValid,
    canSubmit,
    stepStatus,
    setField,
    validateField,
    setSlipFile,
    validateSlipFile,
    validateAll,
    setError,
  };
};

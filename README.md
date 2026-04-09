# Pay with Etegram

This is a library for implementing Etegram payment gateway

## Installation

This library provides a wrapper to add Etegram Payments to your web application

```bash
npm install etegram-pay
```

or

```bash
yarn add etegram-pay
```

## Usage

```tsx
import { payWithEtegram } from "etegram-pay";
import { useForm } from "react-hook-form";

type CheckoutForm = {
  projectID: string;
  publicKey: string;
  productPrice: number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
};

export default function CheckoutFormSample() {
  const { register, handleSubmit } = useForm<CheckoutForm>();

  const onSubmit = async (data: CheckoutForm) => {
    const payload = {
      projectID: data.projectID,
      publicKey: data.publicKey,
      amount: data.productPrice,
      email: data.email,
      phone: data.phone,
      firstname: data.firstName,
      lastname: data.lastName,
      // Lifecycle callbacks
      onOpen: () => {
        console.log("Checkout opened");
      },
      onSuccess: ({ reference }) => {
        console.log("onSuccess callback:", reference);
      },
      onClose: ({ reference, reason }) => {
        console.log("onClose callback:", reference, reason);
      },

      // Compatibility aliases (optional): onsuccess / onclose
      // onsuccess: ({ reference }) => console.log(reference),
      // onclose: ({ reference, reason }) => console.log(reference, reason),
    };

    const result = await payWithEtegram(payload);
    if (result.status === "success") {
      console.log("Payment successful:", result.reference);
      return;
    }

    if (result.status === "cancelled") {
      console.log("Payment cancelled:", result.reference);
      return;
    }

    console.log("Payment modal closed:", result.reference);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="firstName">First name</label>
        <input id="firstName" {...register("firstName")} />
      </div>

      {/* Rest of your form fields */}

      <button type="submit">Submit</button>
    </form>
  );
}
```

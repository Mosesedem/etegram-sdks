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

```JSX
import { payWithEtegram } from 'etegram-pay';
import { useForm } from 'react-hook-form';

export default function CheckoutFormSample(

	const {register, handleSubmit} = useForm();

	const onSubmit = async (data) => {
		/* Here you would send the data from your form to the payWithEtegram.*/

         	//You can pass your reference to the function otherwise one will be generated for you

            const dataToSubmit = {
			  projectID: data.projectID,
			  publicKey: data.publicKey,
			  amount: data.productPrice,
			  email: data.email,
			  phone: data.phone,
			  firstname: data.firstName,
			  lastname: data.lastName,
		}
      		await payWithEtegram(dataToSubmit);
	};
	return (
	     <form onSubmit={handleSubmit(onSubmit)}>
	        <div>
	            <label htmlFor="firstName">FirstName</label>
	            <input {...register("firstName")} />
	        </div>
	        //Rest of your form
	        ...

	        <button>Submit</button>
	    </form>
  	)
)
```

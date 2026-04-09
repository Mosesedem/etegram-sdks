type DataProps = {
  projectID: string;
  publicKey: string;
  email: string;
  amount: string;
  phone: string;
  reference?: string;
  firstname: string;
  lastname: string;
};

declare function generateTransactionReference(length?: number): string;
declare function payWithEtegram(values: DataProps): Promise<void>;

export { generateTransactionReference, payWithEtegram };

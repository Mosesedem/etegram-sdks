"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  generateTransactionReference: () => generateTransactionReference,
  payWithEtegram: () => payWithEtegram,
});
module.exports = __toCommonJS(src_exports);
function generateTransactionReference(length = 12) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let reference = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    reference += characters[randomIndex];
  }
  return reference;
}
async function initialize(transaction) {
  let reference;
  if (transaction?.reference) {
    reference = transaction?.reference;
  } else {
    reference = generateTransactionReference(20);
  }
  let dataToSend = {
    ...transaction,
    reference,
    amount: transaction.amount,
    phone: transaction.phone,
    email: transaction.email,
  };
  try {
    const response = await fetch(
      `https://api-checkout.etegram.com/api/transaction/initialize/${transaction.projectID}`,
      {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${transaction.publicKey}`,
        },
        body: JSON.stringify(dataToSend),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      return { message: "Failed" };
    }
    return data;
  } catch (e) {
    throw new Error("Failed to initialize");
  }
}
async function payWithEtegram(values) {
  var json = values;
  var useId = makeid(10);
  const url = await initialize(values);
  if (url?.message !== "Authorization URL created") {
    return;
  }
  var iframLink = url?.data?.authorization_url;
  var bringModally = document.getElementsByTagName("html")[0];
  var data =
    "    <style>.responsive-iframe" +
    useId +
    " {  position: fixed;  top: 0px;  left: 0;  bottom: 0;  right: 0;  width: 100%;  height: 100%;  border: none; background: url(https://ik.imagekit.io/z6v2xrjwk/output-onlinegiftools.gif?updatedAt=1733743894822) center center no-repeat;  z-index: 2000;}.etegram-payment-link-container-top" +
    useId +
    " {  position: fixed;  top: 0px;}.etegram-payment-link-container-top" +
    useId +
    " div{  width: 20px;  height: 20px;  background: ;  display: flex;  align-items: center;justify-content: border-radius: 50px}.etegram-payment-link-container-top" +
    useId +
    ' img{  width: 10px;}    </style>           <iframe class="responsive-iframe' +
    useId +
    '" id="etegram-user-id-resp-res-dev-tool-abcdefghijklmnopqrstuvwxyz" src="' +
    iframLink +
    '"  allow="clipboard-write"></iframe>';
  var postCreated = createPostForUser(data);
  bringModally.appendChild(postCreated);
}
function createPostForUser(data) {
  var element = document.createElement("div");
  element.classList.add("hdgd67gdhcfhnfun2hcnDhcf");
  element.innerHTML = data;
  return element;
}
function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
if (typeof window !== "undefined") {
  window.addEventListener("message", function (event) {
    if (event.data === "closeIframe") {
      var iframe = document.getElementById(
        "etegram-user-id-resp-res-dev-tool-abcdefghijklmnopqrstuvwxyz",
      );
      var hdgd67gdhcfhnfun2hcnDhcf = document.querySelector(
        ".hdgd67gdhcfhnfun2hcnDhcf",
      );
      if (confirm("You are about to close this payment modal") == true) {
        hdgd67gdhcfhnfun2hcnDhcf?.remove();
      } else {
      }
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 &&
  (module.exports = {
    generateTransactionReference,
    payWithEtegram,
  });

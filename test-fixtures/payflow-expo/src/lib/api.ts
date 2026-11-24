import axios from "axios";

export const api = axios.create({ baseURL: "http://api.payflow-demo.com/v1" });

export const sendMoney = (to: string, amount: number) => api.post("/transfers", { to, amount });

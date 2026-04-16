import QRCode from "qrcode";

import type { PromptpayConfig, PromptpayReceiverType } from "@cip/shared";

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeMerchantText(value: string, fallback: string, maxLength: number) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return (normalized || fallback).slice(0, maxLength);
}

function normalizeReceiver(receiverType: PromptpayReceiverType, receiver: string) {
  const digits = normalizeDigits(receiver);

  if (receiverType === "phone") {
    if (digits.startsWith("66") && digits.length === 11) {
      return digits;
    }

    if (digits.startsWith("0") && digits.length === 10) {
      return `66${digits.slice(1)}`;
    }

    throw new Error("PromptPay phone ต้องเป็นเบอร์มือถือไทย 10 หลัก หรือขึ้นต้นด้วย 66");
  }

  if (digits.length !== 13) {
    throw new Error("PromptPay nationalId / taxId ต้องมี 13 หลัก");
  }

  return digits;
}

function receiverSubTag(receiverType: PromptpayReceiverType) {
  return receiverType === "phone" ? "01" : "02";
}

function amountToString(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

function crc16(value: string) {
  let crc = 0xffff;

  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }

      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function maskPromptpayReceiver(receiverType: PromptpayReceiverType, receiver: string) {
  const normalized = normalizeReceiver(receiverType, receiver);

  if (receiverType === "phone") {
    return `0${normalized.slice(2, 4)}-***-${normalized.slice(-3)}`;
  }

  return `${normalized.slice(0, 3)}-*****-${normalized.slice(-3)}`;
}

export function createPromptpayPayload(config: PromptpayConfig, amountCents: number, referenceCode?: string) {
  const receiver = normalizeReceiver(config.receiverType, config.receiver);
  const merchantAccountInfo = tlv(
    "29",
    `${tlv("00", "A000000677010111")}${tlv(receiverSubTag(config.receiverType), receiver)}`
  );
  const additionalData = referenceCode ? tlv("62", tlv("05", referenceCode.slice(0, 25))) : "";
  const payloadWithoutCrc = [
    tlv("00", "01"),
    tlv("01", amountCents > 0 ? "12" : "11"),
    merchantAccountInfo,
    tlv("52", "0000"),
    tlv("53", "764"),
    tlv("54", amountToString(amountCents)),
    tlv("58", "TH"),
    tlv("59", normalizeMerchantText(config.merchantName, "CIP SHOP", 25)),
    tlv("60", normalizeMerchantText(config.merchantCity, "BANGKOK", 15)),
    additionalData,
    "6304"
  ].join("");

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}

export async function createPromptpayQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 360,
    color: {
      dark: "#17313b",
      light: "#ffffff"
    }
  });
}

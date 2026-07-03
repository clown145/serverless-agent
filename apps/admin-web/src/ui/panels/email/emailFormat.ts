import type { EmailAddress } from "../../../api/types";

export function formatEmailAddress(address: EmailAddress): string {
  return address.name ? `${address.name} <${address.address}>` : address.address;
}

export function formatEmailList(addresses: EmailAddress[] | undefined): string {
  return (addresses ?? []).map(formatEmailAddress).join(", ");
}

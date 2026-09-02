import { IsString } from 'class-validator';

export class PaySessionDto {
  // The token read off the merchant's checkout QR — proves the customer is
  // physically at that store's till, not just re-selecting a merchant from
  // memory. See MerchantStore.checkoutToken.
  @IsString()
  checkoutToken: string;
}

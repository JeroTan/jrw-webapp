export function redirectProductBuyNowToCheckout(
  location: Pick<Location, "assign"> = window.location
) {
  location.assign("/checkout");
}

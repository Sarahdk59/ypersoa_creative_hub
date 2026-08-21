import { redirect } from "next/navigation";

/** Le Cartouche n'est plus un outil séparé : la création démarre dans Social. */
export default function SocialPostRedirect() {
  redirect("/social");
}

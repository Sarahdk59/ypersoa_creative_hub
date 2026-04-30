import { redirect } from "next/navigation";

/**
 * Home Hub : redirige par défaut vers l'atelier social, app primaire actuelle.
 */
export default function HubHomePage() {
  redirect("/social");
}

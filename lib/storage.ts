import { v2 as cloudinary } from "cloudinary";

/**
 * Persistance des photos de salles sur Cloudinary.
 *
 * Ce module reste la seule frontière avec le stockage : les actions et les
 * composants ne connaissent que `StoredPhoto`. Changer de fournisseur ne demande
 * de réécrire que les fonctions ci-dessous.
 *
 * Les fichiers transitent par le serveur (l'action reçoit le `FormData`, puis
 * pousse les octets vers Cloudinary). C'est ce qui permet de valider type et
 * poids avant tout envoi : avec un envoi direct navigateur → Cloudinary via
 * preset non signé, n'importe qui pourrait déposer n'importe quoi sur le compte.
 * En contrepartie, la charge utile de l'action doit rester sous
 * `serverActions.bodySizeLimit` (voir next.config.mjs).
 */

/** Dossier Cloudinary racine des photos de salles. */
const ROOT_FOLDER = "liudor/rooms";

export interface StoredPhoto {
  /** URL publique servie par Cloudinary (HTTPS). */
  url: string;
  /** `public_id` Cloudinary, nécessaire à la suppression. */
  publicId: string;
}

/**
 * Configuration lue à l'appel plutôt qu'au chargement du module : en
 * développement, ajouter les variables au `.env` prend effet au rechargement
 * suivant, sans redémarrage complet.
 *
 * Deux écritures acceptées : `CLOUDINARY_URL` (forme
 * `cloudinary://<api_key>:<api_secret>@<cloud_name>`, lue automatiquement par le
 * SDK) ou les trois variables séparées.
 */
function configure(): boolean {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    return true;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return false;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return true;
}

/** Erreur de configuration : distinguée des échecs réseau côté appelant. */
export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Stockage des photos non configuré : renseignez CLOUDINARY_URL (ou CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET) dans votre .env."
    );
    this.name = "StorageNotConfiguredError";
  }
}

/**
 * Cloudinary a refusé l'opération (401/403).
 *
 * Cas le plus fréquent : la clé API utilisée est une clé *restreinte*. Elle
 * authentifie correctement (l'endpoint /ping répond `ok`) mais ne porte pas la
 * permission `create`, seule habilitée à téléverser. C'est une erreur permanente
 * de configuration, à ne pas présenter comme une panne passagère.
 */
export class StorageForbiddenError extends Error {
  constructor(readonly httpCode: number) {
    super(
      `Cloudinary a refusé l'envoi (HTTP ${httpCode}). Vérifiez que la clé API porte la permission « create » sur les assets (Settings → API Keys).`
    );
    this.name = "StorageForbiddenError";
  }
}

/**
 * Le SDK enveloppe les réponses inattendues dans une erreur `UnexpectedResponse`
 * qui perd le corps de la réponse : on ne dispose que du code HTTP, d'où cette
 * lecture défensive.
 */
function asHttpCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { http_code?: unknown }).http_code;
  return typeof code === "number" ? code : null;
}

/** Indique si le stockage est utilisable, sans rien envoyer. */
export function isStorageConfigured(): boolean {
  return configure();
}

/**
 * Envoie les photos d'une salle et renvoie leurs URLs, dans l'ordre reçu.
 *
 * Les assets déjà envoyés sont supprimés si l'un des suivants échoue : une
 * création interrompue ne laisse pas de fichiers orphelins sur le compte.
 */
export async function saveRoomPhotos(
  roomId: string,
  files: File[]
): Promise<StoredPhoto[]> {
  if (files.length === 0) return [];
  if (!configure()) throw new StorageNotConfiguredError();

  const uploaded: StoredPhoto[] = [];

  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      uploaded.push(await uploadBuffer(buffer, `${ROOT_FOLDER}/${roomId}`));
    }
  } catch (error) {
    await Promise.all(uploaded.map((photo) => deleteRoomPhoto(photo)));
    throw error;
  }

  return uploaded;
}

/**
 * Envoi d'un buffer via l'API de streaming.
 *
 * `upload_stream` est la seule API du SDK acceptant des octets en mémoire ; elle
 * est fondée sur un callback, d'où la promesse construite à la main.
 */
function uploadBuffer(buffer: Buffer, folder: string): Promise<StoredPhoto> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // Cloudinary génère l'identifiant : le nom d'origine du fichier n'est
        // jamais réutilisé (caractères imprévisibles, collisions possibles).
        unique_filename: true,
        use_filename: false,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          const httpCode = asHttpCode(error);
          return reject(
            httpCode === 401 || httpCode === 403
              ? new StorageForbiddenError(httpCode)
              : error
          );
        }
        if (!result) return reject(new Error("Réponse Cloudinary vide."));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(buffer);
  });
}

/**
 * Supprime une photo.
 *
 * Sans `publicId` (photo importée hors Cloudinary), il n'y a rien à supprimer
 * côté fournisseur : la ligne en base est retirée par l'appelant, on sort sans
 * erreur. Une suppression ne doit jamais faire échouer l'enregistrement du reste
 * du formulaire, donc les échecs sont journalisés et non propagés.
 */
export async function deleteRoomPhoto(photo: {
  /** Null pour une photo qui ne provient pas de Cloudinary. */
  publicId: string | null;
}): Promise<void> {
  if (!photo.publicId) return;
  if (!configure()) return;

  try {
    await cloudinary.uploader.destroy(photo.publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error) {
    console.error(
      `[storage] suppression Cloudinary impossible (${photo.publicId})`,
      error
    );
  }
}

/**
 * Supprime toutes les photos d'une salle, dossier compris.
 *
 * À appeler lors de la suppression d'une salle. Le dossier est retiré après ses
 * assets : Cloudinary refuse de supprimer un dossier non vide.
 */
export async function deleteRoomPhotoDirectory(roomId: string): Promise<void> {
  if (!configure()) return;

  const folder = `${ROOT_FOLDER}/${roomId}`;

  try {
    await cloudinary.api.delete_resources_by_prefix(folder);
    await cloudinary.api.delete_folder(folder);
  } catch (error) {
    console.error(`[storage] nettoyage du dossier ${folder} impossible`, error);
  }
}

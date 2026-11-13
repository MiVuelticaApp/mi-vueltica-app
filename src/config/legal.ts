/**
 * Privacy notice (Ley 8968 art. 5), terms and community rules.
 *
 * `PRIVACY_VERSION` is what the app sends with the first sign-in (`privacyVersion`) and with
 * `POST /me/privacy-consent`; bump it whenever the privacy text changes so everyone is asked again.
 *
 * `LEGAL_FINAL` stays false until the final texts are approved (issue #18, texts by the team's legal
 * owner). While false, the screens show the BORRADOR badge. The texts below describe what the app and
 * mi-vueltica-api actually store and do; the legal owner still has to review the wording, name the
 * responsible party and confirm the retention periods.
 */
export const PRIVACY_VERSION = '2026-11-13';
export const LEGAL_FINAL = false;
/** Public copy of the privacy policy for the store listings. Empty until it is published. */
export const PRIVACY_URL = '';
export const CONTACT_EMAIL = 'mivuelticacr@gmail.com';

export interface LegalSection {
  title: string;
  body: string[];
}

/** Shown before the first Google / Apple sign-in, with an explicit "Acepto". */
export const PRIVACY_NOTICE: LegalSection[] = [
  {
    title: 'Qué guardamos',
    body: [
      'Tu nombre y tu correo, tal como los entrega Google o Apple al iniciar sesión.',
      'Lo que aportás: vuelticas sugeridas (con sus fotos), reseñas, verificaciones, reportes y votos de moderación.',
      'Tus guardados, tu provincia si la elegís, tus puntos y nivel, y tus preferencias de notificaciones.',
      'Las fotos se guardan sin datos de ubicación ni metadatos: el servidor los elimina al subirlas.',
      'Tu ubicación se usa solo mientras usás la app para mostrarte planes cerca, y no se guarda.',
    ],
  },
  {
    title: 'Para qué',
    body: ['Para que puedas guardar planes, aportar a la comunidad y escribir reseñas, y para moderar lo que se publica.'],
  },
  {
    title: 'Quién lo ve',
    body: [
      'Las vuelticas y reseñas publicadas muestran tu nombre (nombre e inicial del apellido). Los reportes son anónimos.',
      'Tu correo no se muestra a nadie. El equipo de MiVueltica puede ver tus aportes para moderarlos.',
    ],
  },
  {
    title: 'Responsable',
    body: [`El equipo de MiVueltica. Contacto: ${CONTACT_EMAIL}.`],
  },
  {
    title: 'Tus derechos',
    body: [
      'Podés consultar y descargar tus datos (Ajustes › Descargar mis datos), corregirlos y pedir que se eliminen.',
      'Podés retirar tu consentimiento en cualquier momento eliminando tu cuenta (Ajustes › Eliminar cuenta): se borran tus datos personales y tus reseñas.',
    ],
  },
];

export const TERMS: LegalSection[] = [
  {
    title: 'Uso de la app',
    body: [
      'MiVueltica muestra lugares y eventos gratis o de hasta ₡5.000 por persona. La información la aporta y verifica la comunidad: confirmá precios y horarios antes de ir.',
      'Podés explorar sin cuenta. Para guardar, aportar, reseñar o moderar necesitás iniciar sesión con Google o Apple.',
    ],
  },
  {
    title: 'Tu contenido',
    body: [
      'Sos responsable de lo que publicás. Al publicar, permitís que MiVueltica lo muestre en la app.',
      'Podemos ocultar o eliminar contenido que incumpla las Normas de la comunidad, y la comunidad puede reportarlo.',
    ],
  },
  {
    title: 'Tu cuenta',
    body: ['Podés eliminar tu cuenta en cualquier momento desde Ajustes. Podés bloquear a otras personas para no ver su contenido.'],
  },
];

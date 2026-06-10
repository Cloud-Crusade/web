import { apiClient } from '@/lib/apiClient';

// 봇/매크로 억제용 ALTCHA PoW 캡차. 플래그 off(기본) 면 토큰 없이 진행한다.
// 호출 시점에 평가 — 테스트에서 env 스텁이 적용되도록 모듈 로드 시 캡처하지 않는다.
function isCaptchaEnabled(): boolean {
  return import.meta.env.VITE_CAPTCHA_ENABLED === 'true';
}

interface CaptchaChallenge {
  algorithm: string;
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// 챌린지를 받아 PoW(salt+number 해시가 challenge 와 일치하는 number 탐색)를 풀고
// ALTCHA payload(base64) 를 만든다. 라이브러리 의존 없이 Web Crypto 만 사용.
export async function solveCaptchaToken(): Promise<string | undefined> {
  if (!isCaptchaEnabled()) {
    return undefined;
  }

  const { data } = await apiClient.get<CaptchaChallenge>('/captcha/challenge');

  let number = 0;
  for (let candidate = 0; candidate <= data.maxnumber; candidate += 1) {
    if ((await sha256Hex(`${data.salt}${candidate}`)) === data.challenge) {
      number = candidate;
      break;
    }
  }

  const payload = {
    algorithm: data.algorithm,
    challenge: data.challenge,
    number,
    salt: data.salt,
    signature: data.signature,
  };
  return btoa(JSON.stringify(payload));
}

import { apiClient } from '@/lib/apiClient';
import { ApiError } from '@/lib/apiError';

const SUPPORTED_ALGORITHM = 'SHA-256';

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

  // 지원 알고리즘이 아니면 잘못된 토큰 생성을 막고 명시적으로 실패시킨다
  if (data.algorithm !== SUPPORTED_ALGORITHM) {
    throw new ApiError(0, {
      code: 'CAPTCHA_UNSUPPORTED',
      message: '봇 방지 확인을 처리할 수 없어요. 잠시 후 다시 시도해 주세요.',
    });
  }

  let solved: number | undefined;
  for (let candidate = 0; candidate <= data.maxnumber; candidate += 1) {
    if ((await sha256Hex(`${data.salt}${candidate}`)) === data.challenge) {
      solved = candidate;
      break;
    }
  }
  // 풀이 실패 시 number=0 같은 무효 토큰을 보내지 않고 명시적 에러로 위임(useMutation)
  if (solved === undefined) {
    throw new ApiError(0, {
      code: 'CAPTCHA_SOLVE_FAILED',
      message: '봇 방지 확인에 실패했어요. 다시 시도해 주세요.',
    });
  }

  const payload = {
    algorithm: data.algorithm,
    challenge: data.challenge,
    number: solved,
    salt: data.salt,
    signature: data.signature,
  };
  return btoa(JSON.stringify(payload));
}

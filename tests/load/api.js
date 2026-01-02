import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // 가상 사용자 20명까지 증가
    { duration: '1m', target: 20 },  // 1분간 유지
    { duration: '30s', target: 0 },  // 종료
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%의 요청이 500ms 이내여야 함
  },
};

const API_KEY = __ENV.API_KEY || 'TEST_KEY';
const WEB_APP_URL = __ENV.WEB_APP_URL || 'https://script.google.com/macros/s/.../exec';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 1. 상태 확인 (가벼운 호출)
  const res = http.get(`${WEB_APP_URL}?action=status&apiKey=${API_KEY}`, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/2': (r) => r.proto === 'HTTP/2.0',
  });

  sleep(1);
}

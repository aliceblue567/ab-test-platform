import {
  checkKoreanOrthography,
  formatKoreanOrthographyMatches,
} from "../lib/ux-writing/korean-orthography";

const cases = [
  ["몇일 뒤에 출발해요.", "며칠 뒤에 출발해요."],
  ["내일 확인할께요.", "내일 확인할게요."],
  ["오랫만에 떠나는 여행이에요.", "오랜만에 떠나는 여행이에요."],
  ["웬지 설레는 여행이에요.", "왠지 설레는 여행이에요."],
  ["여행 정보를 확인해 주세요.", "여행 정보를 확인해 주세요."],
] as const;

for (const [input, expected] of cases) {
  const result = checkKoreanOrthography(input);
  if (result.correctedText !== expected) {
    throw new Error(
      `교정 실패: ${input} → ${result.correctedText}, 기대값: ${expected}`
    );
  }
  if (input !== expected && !formatKoreanOrthographyMatches(result.matches)) {
    throw new Error(`근거 누락: ${input}`);
  }
}

console.log(`한국어 맞춤법 로컬 검사 ${cases.length}건 통과`);

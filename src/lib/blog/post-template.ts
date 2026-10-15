export const POST_TEMPLATE_FILE_NAME = "blog-post-template.md";

// 안내는 프론트매터 안의 YAML 주석으로만 두어 가져온 뒤 본문에 남지 않게 함
// 주석 안에 하이픈 3개 연속을 쓰면 프론트매터 펜스가 조기 종료되므로 "줄 구분선"으로 돌려 씀
export function buildPostTemplate(date: string): string {
  return `---
# 이 블록의 # 줄은 안내이며 불러올 때 무시됩니다
# title: 글 제목입니다. 비워 두면 파일명이 제목이 됩니다
# date: YYYY-MM-DD 형식입니다. 파일명 앞에 날짜를 붙이면 파일명 날짜가 우선합니다
# categories, tags: 여러 개는 쉼표로 구분하고 각각 따옴표로 감쌉니다
# 이 블록 안에는 줄 구분선 문자열을 쓰지 마세요
title: "글 제목을 입력하세요"
date: ${date}
categories: ["카테고리 예시"]
tags: ["태그 예시1", "태그 예시2"]
---

## 소제목

본문을 작성하세요.
`;
}

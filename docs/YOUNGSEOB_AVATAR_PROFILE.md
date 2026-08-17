# Youngseob Avatar Profile

> Status: **Training in progress**  
> Target: **500 high-quality training samples**  
> Current count: **0 / 500**  
> Repository: `Skylark51/KongJuiYa_Chem`  
> Canonical branch: `main`

---

## 1. Project Goal

이 문서는 이영섭의 실제 발화, 글쓰기 방식, 수정 습관, 선호/비선호 표현, 정보 선택 방식과 장문 구성 방식을 장기간 축적하여 **“이영섭처럼 생각하고 쓰는 개인 글쓰기 아바타”**를 만드는 것을 목표로 한다.

단순한 말투 복제기가 아니다. 최종 목표는 주어진 사건·메모·음성 전사·연구 내용·일상 소재를 보고 다음을 재현하는 것이다.

1. 무엇을 핵심으로 선택하는가.
2. 무엇을 생략하는가.
3. 어떤 순서로 이야기하는가.
4. 어떤 어휘와 문장 길이를 사용하는가.
5. 어떤 AI식 표현을 거부하는가.
6. 초안을 어떤 방향으로 수정하는가.
7. 블로그/장문/연구 글/콘텐츠 등 장르에 따라 같은 사람의 문체를 어떻게 변형하는가.

최종적으로 이 문서는 사람이 읽을 수 있는 **스타일 명세서**이자, AI가 직접 참조할 수 있는 **Youngseob Avatar System Profile**로 발전시킨다.

---

## 2. Agreed Training Strategy

### 2.1 숫자만 채우지 않는다

500개의 질문을 기계적으로 채우는 것이 목적이 아니다. 하나의 샘플은 가능하면 다음 중 하나 이상의 실제 패턴을 보여줘야 한다.

- 표현 선호
- 표현 비선호
- 사건 선택 기준
- 글의 전개 순서
- 유머 방식
- 감정 표현 방식
- 기술적 설명 방식
- AI 초안에 대한 비판
- 직접 수정한 문장
- 초안 → 수정본 → 승인본 변환

정보량이 거의 없는 답변은 억지로 하나의 학습 샘플로 계산하지 않는다.

### 2.2 가장 가치 있는 데이터 형태

가장 우선적으로 축적할 데이터는 다음과 같다.

```text
사용자의 원래 발화/메모
        ↓
AI 초안
        ↓
사용자의 비판 및 수정 지시
        ↓
수정된 초안
        ↓
사용자가 승인한 최종본
```

특히 **사용자가 무엇을 왜 고쳤는지**를 중요하게 기록한다.

### 2.3 초기에는 Fine-tuning보다 Profile + Retrieval을 우선한다

초기 단계에서는 모델 자체를 바로 fine-tuning하지 않는다.

우선 다음을 구축한다.

- Style Profile
- Negative Style Rules
- Approved Examples
- Transformation Examples
- Personal/Project Memory와의 분리 구조
- Youngseob Critic 평가 기준

충분한 승인 데이터가 쌓이면 이후 JSONL 등 구조화 데이터셋으로 변환하여 fine-tuning 가능성을 검토한다.

### 2.4 사실과 문체를 분리한다

- **Style/Profile**: 어떻게 쓰는가.
- **Memory/RAG**: 실제로 무슨 일이 있었는가.

개인 사실을 문체 규칙과 혼합하지 않는다. 사실은 변경·갱신될 수 있어야 한다.

---

## 3. Target Architecture

```text
Youngseob Avatar
│
├─ Core Persona / Writing Principles
├─ Style Profiles
│  ├─ Blog
│  ├─ Long-form / Casual
│  ├─ Research / Technical
│  ├─ YouTube Script
│  ├─ Social Content
│  └─ Professional Writing
│
├─ Transformation Examples
│  └─ Spoken/Raw Input → Youngseob-style Output
│
├─ Negative Examples
│  └─ AI-like or rejected writing patterns
│
├─ Approved Examples
│  └─ User-approved final writing
│
├─ Youngseob Critic
│  └─ “이 글이 실제 이영섭이 쓴 것 같은가?” 평가
│
└─ Training Records
   └─ YS-001 ... YS-500
```

---

## 4. Training Phases

### Phase A — 001–100: Style Discovery

목표:

- 기본 문장 길이
- 문단 길이
- 서론 방식
- 결론 방식
- 선호/비선호 어휘
- AI식 상투어 탐지
- 일상 사건 설명 방식
- 기술적 사건 설명 방식

질문, A/B 비교, 짧은 수정 과제를 병행한다.

### Phase B — 101–250: Transformation Learning

목표:

- 실제 발화를 블로그/장문으로 변환
- 같은 사건의 여러 장르 변환
- 무엇을 강조하고 무엇을 버리는지 학습
- AI 초안에 대한 반복 수정

### Phase C — 251–400: Long-form Reconstruction

목표:

- 실제 장문 생성
- 사건 여러 개의 배치 순서
- 긴 글에서의 리듬
- 유머/분노/흥분/기술 설명의 자연스러운 혼합
- “AI가 쓴 글 같다”는 느낌을 줄이는 규칙 확정

### Phase D — 401–500: Validation & Adversarial Testing

목표:

- 낯선 소재에서도 동일한 스타일 유지
- 서로 비슷한 문체와 구별
- 일부러 AI스럽게 쓴 문장을 사용자가 교정
- 장르 전환 검증
- 최종 Youngseob Critic rubric 확정
- System Prompt 작성

---

## 5. Current Seed Conversation

본 프로젝트는 2026-08-17 대화에서 시작되었다.

### 사용자 요구의 핵심

- “내 말을 완전히 답습해서 블로그 글이나 장문을 시켜주는” 시스템을 원한다.
- 장기간 학습해도 괜찮으며, 최종적으로 **‘이영섭의 아바타’**에 가까운 프로그램을 목표로 한다.
- 단순한 문체 흉내가 아니라 실제 사용 가능한 수준을 원한다.
- 500개의 실질적인 학습 샘플을 현재 대화에서 축적하기로 했다.
- 최종 결과는 Markdown으로 정리한다.
- 이 Markdown은 GitHub의 별도 임시 branch가 아니라 `KongJuiYa_Chem`의 **`main` branch**에 지속적으로 축적한다.

### 현재 합의된 현실적인 기대치

- 10회 이하: 피상적인 말투 모사 수준
- 30회 전후: prototype
- 50–80개의 질 좋은 세션: 특정 장르에서 상당한 유사성을 목표로 할 수 있음
- 150–300개의 작성→수정→승인 사이클: 실사용 가능한 개인 글쓰기 아바타를 목표로 함
- 500개: 장문, 변환 규칙, negative examples, critic까지 포함한 v1 학습 corpus 완성 목표

이 숫자는 성능을 보장하는 수치가 아니라 **학습 데이터 설계를 위한 운영 기준**이다. 데이터 품질이 단순 질답 횟수보다 우선한다.

---

## 6. Current Known Design Principles

현재 대화에서 확정된 원칙만 기록한다. 아직 검증되지 않은 성격/문체 특성을 추측해서 추가하지 않는다.

1. 사용자가 실제로 수정한 결과를 가장 중요한 학습 데이터로 본다.
2. 사용자가 싫어하는 표현을 명시적으로 기록한다.
3. 단순 단어 빈도보다 **정보 선택과 전개 방식**을 중요하게 본다.
4. 블로그와 연구 글 등 장르별 profile을 분리한다.
5. 공통적인 `Youngseob Core`는 장르별 profile이 공유하도록 한다.
6. 실제 개인 사실은 Style Profile과 분리하여 관리한다.
7. 최종 생성 전에 `Youngseob Critic`이 문체 적합성을 평가할 수 있도록 한다.
8. 초기에는 질문형 인터뷰를 많이 사용하고, 후반에는 실제 작성→수정→승인 데이터를 중심으로 전환한다.

---

## 7. Training Record Format

각 샘플은 가능한 경우 다음 양식을 따른다.

```markdown
### YS-001 — [짧은 제목]

- Date:
- Category:
- Input type: Interview / A-B / Rewrite / Long-form / Critique / Approved Draft
- Confidence: Low / Medium / High

#### Prompt / Context
...

#### Youngseob Response
...

#### Extracted Pattern
- ...

#### Negative Rule, if any
- ...

#### Positive Rule, if any
- ...

#### Before → After, if available
Before:
...

After:
...

#### Notes
...
```

한 답변에서 서로 독립적인 패턴이 여러 개 확인되면 여러 샘플로 나눌 수 있다. 반대로 실질적인 정보가 없으면 카운트를 올리지 않는다.

---

## 8. Style Profile

> 아직 본격적인 인터뷰 전. 검증된 데이터가 쌓일 때마다 업데이트한다.

### 8.1 Voice & Tone

TBD

### 8.2 Sentence Rhythm

TBD

### 8.3 Paragraph Structure

TBD

### 8.4 Openings

TBD

### 8.5 Endings

TBD

### 8.6 Humor

TBD

### 8.7 Strong Emotion / Anger

TBD

### 8.8 Technical Explanation

TBD

---

## 9. Negative Style Rules

> 실제 사용자의 거부/수정 사례에서만 확정한다.

TBD

---

## 10. Approved Transformation Rules

> 실제 Before → After 사례에서 추출한다.

TBD

---

## 11. Youngseob Critic Rubric

최종적으로 100점 기준 평가기를 만든다. 현재는 항목만 정의하고 가중치는 데이터가 쌓인 뒤 확정한다.

- Voice similarity
- Information selection similarity
- Structural similarity
- Sentence rhythm similarity
- Vocabulary similarity
- AI-ism penalty
- Unwanted sentimentality penalty
- Repetition penalty
- Genre appropriateness
- Factual grounding

---

## 12. Training Records

### Counter

**0 / 500**

아직 사용자의 첫 번째 스타일 인터뷰 응답을 받기 전이므로, 프로젝트 정의 자체를 억지로 `YS-001`로 계산하지 않는다.

---

## 13. Final Deliverables at 500 / 500

500개의 유효 샘플이 채워지면 이 문서를 정리하여 다음을 완성한다.

1. Youngseob Core Persona
2. Blog Style Profile
3. Long-form Style Profile
4. Research/Technical Style Profile
5. Negative Style Dictionary
6. Approved phrase/structure patterns
7. Before → After transformation library
8. Youngseob Critic rubric
9. Retrieval guidelines
10. `Youngseob Avatar System Prompt`
11. 구조화된 학습 데이터(JSONL 등)로 변환하기 위한 schema
12. v1 검증 결과 및 알려진 한계

---

## 14. Operating Rule for This Conversation

이 대화에서는 학습을 계속 진행한다.

각 유효한 답변 후:

1. 답변에서 실제로 확인된 패턴을 추출한다.
2. 샘플 번호를 부여한다.
3. 누적 카운트를 갱신한다.
4. 이 Markdown에 해당 내용을 추가한다.
5. 추측이 아니라 사용자 발화와 수정 사례에 근거한 내용만 확정 규칙으로 승격한다.

목표는 **500이라는 숫자를 채우는 것이 아니라, 500개를 채웠을 때 실제로 이영섭의 글을 높은 일관성으로 재현할 수 있는 corpus를 갖는 것**이다.

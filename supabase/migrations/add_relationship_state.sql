-- relationships 테이블에 다차원 관계 상태 컬럼 추가
ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS attraction  integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS trust       integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS comfort     integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS conflict    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage       text    NOT NULL DEFAULT 'stranger';

-- 기존 affection 기반으로 초기 stage 추정 (마이그레이션 편의)
UPDATE relationships SET
  stage = CASE
    WHEN affection >= 280 THEN 'intimate'
    WHEN affection >= 150 THEN 'dating'
    WHEN affection >= 60  THEN 'interested'
    ELSE 'stranger'
  END,
  trust      = LEAST(100, affection / 5),
  comfort    = LEAST(100, affection / 5),
  attraction = LEAST(100, 30 + affection / 10)
WHERE attraction = 30 AND trust = 10;  -- 아직 기본값인 행만

import { Project, ProjectSummary, AssetLink } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 1) Helper: serializeProjectState
 * Strips out unnecessary UI state if any, deep copies the project.
 */
export function serializeProjectState(project: Project): Project {
  // structuredClone is available in modern browsers.
  return structuredClone(project);
}

/**
 * 2) Helper: buildProjectSummary
 * Generates a light-weight JSON summary for HQ dashboard.
 */
export function buildProjectSummary(project: Project): ProjectSummary {
  const p1Done = project.phase1Items.filter(i => i.done).length;
  const p1Total = project.phase1Items.length;
  const p1Pct = p1Total > 0 ? Math.round((p1Done / p1Total) * 100) : 0;

  const p2Done = project.phase2Items.filter(i => i.done).length;
  const p2Total = project.phase2Items.length;
  const p2Pct = p2Total > 0 ? Math.round((p2Done / p2Total) * 100) : 0;

  const installDateItem = project.phase2Items.find(i => i.title === '설치 희망일 확인');
  const expectedInstallDate = installDateItem?.subform?.date;

  return {
    projectId: project.id,
    hospitalName: project.hospitalProfile.hospitalName,
    hospitalRegion: project.hospitalProfile.region,
    dealerId: project.salesProfile.dealerId || project.salesProfile.dealerName,
    templateVersionId: project.templateVersionId || 'unknown',
    templateVersionName: project.templateVersionName || 'unknown',
    status: project.status,
    phase1Progress: p1Pct,
    phase2Progress: p2Pct,
    placedItemsCount: project.placedItems.length,
    expectedInstallDate,
    updatedAt: project.updatedAt,
  };
}

/**
 * 3) Helper: exportProjectAsJson
 * Triggers JSON download for the project data.
 */
export function exportProjectAsJson(project: Project, mode: 'full' | 'summary') {
  let dataStr = '';
  let filename = '';

  if (mode === 'full') {
    const data = serializeProjectState(project);
    dataStr = JSON.stringify(data, null, 2);
    filename = `${project.hospitalProfile.hospitalName}_full_backup.json`;
  } else {
    const summary = buildProjectSummary(project);
    dataStr = JSON.stringify(summary, null, 2);
    filename = `${project.hospitalProfile.hospitalName}_summary.json`;
  }

  downloadStringAsFile(dataStr, filename, 'application/json');
}

/**
 * 4) Helper: exportProjectAsHtml
 * Generates a standalone HTML document embedding project JSON and summary visualization.
 */
export function exportProjectAsHtml(project: Project, assets: AssetLink[]) {
  const projectJson = JSON.stringify(serializeProjectState(project));
  const summary = buildProjectSummary(project);

  const sharedAssetsHtml = assets.filter(a => a.isSharedAsset).map(a => `
    <li class="asset-item">
      <div>
        <strong>[${a.assetCategory}]</strong> ${a.title}
        <div class="desc">${a.description}</div>
      </div>
      <a href="${a.url}" target="_blank" class="btn">열기</a>
    </li>
  `).join('');

  const projectAssetsHtml = assets.filter(a => !a.isSharedAsset).map(a => `
    <li class="asset-item">
      <div>
        <strong>[${a.assetCategory}]</strong> ${a.title}
        <div class="desc">${a.description}</div>
      </div>
      <a href="${a.url}" target="_blank" class="btn">열기</a>
    </li>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${project.hospitalProfile.hospitalName} - Paradigm Project Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 2rem; display: flex; justify-content: center; }
    .container { max-width: 900px; width: 100%; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 2rem; }
    h1 { margin-top: 0; font-size: 1.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; color: #1e293b; }
    h2 { font-size: 1.25rem; color: #334155; margin-top: 2rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; font-size: 0.875rem; }
    th { background: #f8fafc; color: #475569; width: 150px; font-weight: 600; }
    .asset-list { list-style: none; padding: 0; margin: 1rem 0; }
    .asset-item { display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 6px; margin-bottom: 0.5rem; background: #fafafa; }
    .asset-item strong { color: #3b82f6; }
    .asset-item .desc { font-size: 0.8125rem; color: #64748b; margin-top: 0.25rem; }
    .btn { display: inline-block; padding: 0.5rem 1rem; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 0.875rem; font-weight: 500; }
    .btn:hover { background: #2563eb; }
    .meta-info { font-size: 0.8125rem; color: #94a3b8; text-align: right; margin-top: 2rem; border-top: 1px dashed #e2e8f0; padding-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>[${project.salesProfile.dealerName}] ${project.hospitalProfile.hospitalName} 프로젝트 패키지</h1>

    <h2>기본 요약 정보</h2>
    <table>
      <tbody>
        <tr><th>프로젝트 상태</th><td>${summary.status}</td></tr>
        <tr><th>지역</th><td>${summary.hospitalRegion}</td></tr>
        <tr><th>Phase 1 진행도</th><td>${summary.phase1Progress}%</td></tr>
        <tr><th>Phase 2 진행도</th><td>${summary.phase2Progress}%</td></tr>
        <tr><th>템플릿 버전</th><td>${summary.templateVersionName}</td></tr>
        <tr><th>설치 희망일</th><td>${summary.expectedInstallDate || '미정'}</td></tr>
        <tr><th>총 배치 장비 수</th><td>${summary.placedItemsCount}대</td></tr>
      </tbody>
    </table>

    <h2>프로젝트 자료 (도면, 사진, 최종 출력물)</h2>
    ${projectAssetsHtml ? '<ul class="asset-list">' + projectAssetsHtml + '</ul>' : '<p style="color: #94a3b8; font-size: 0.875rem;">등록된 자료가 없습니다.</p>'}

    <h2>공통 참조 자료 (교육/규정)</h2>
    ${sharedAssetsHtml ? '<ul class="asset-list">' + sharedAssetsHtml + '</ul>' : '<p style="color: #94a3b8; font-size: 0.875rem;">등록된 공통 자료가 없습니다.</p>'}

    <div class="meta-info">
      생성일시: ${new Date().toLocaleString()}<br>
      이 HTML 문서는 원본 JSON 데이터를 내장하고 있어, 추후 시스템 Import 시 복원이 가능합니다.
    </div>
  </div>

  <!-- EMBEDDED PROJECT JSON FOR FUTURE IMPORT -->
  <script type="application/json" id="embedded-project-json">
${projectJson}
  </script>
</body>
</html>`;

  downloadStringAsFile(htmlContent, `${project.hospitalProfile.hospitalName}_ProjectExport.html`, 'text/html');
}

/**
 * 5) Helper: parseEmbeddedProjectData
 * Parses project data back from the HTML file.
 */
export function parseEmbeddedProjectData(html: string): Project | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const scriptTag = doc.getElementById('embedded-project-json');
    if (scriptTag && scriptTag.textContent) {
      return JSON.parse(scriptTag.textContent) as Project;
    }
  } catch (err) {
    console.error('Failed to parse embedded project data:', err);
  }
  return null;
}

/**
 * 6) Helper: cloneProjectForImport
 * Safely clones a project applying a new UUID and appending import metadata tags.
 */
export function cloneProjectForImport(project: Project, fileType: 'html' | 'json'): Project {
  // Deep clone first to isolate references
  const cloned = serializeProjectState(project);
  
  const originalId = cloned.id;
  const newId = uuidv4();
  
  cloned.id = newId;
  cloned.importedFromProjectId = originalId;
  cloned.importedFromTemplateVersion = cloned.templateVersionId;
  cloned.importedAt = new Date().toISOString();
  cloned.importedFromFileType = fileType;
  cloned.importMode = 'clone';
  
  // Also rename the hospital name to denote it's an imported clone
  cloned.hospitalProfile.hospitalName = `${cloned.hospitalProfile.hospitalName} (수신본)`;
  
  // Remap inner IDs that strictly needed re-mapping. 
  // For most parts, keeping the same UUIDs inside components/placedItems is fine unless they collide with other projects.
  // Since items are strictly scoped to the project, inner UUIDs don't globally collide usually, 
  // but let's reassign currentVersionId logic if needed. We'll leave inner IDs as-is to preserve references.

  return cloned;
}

/**
 * 7) Helper: exportForHeadquarters
 * 본사 전송용 — 대리점명_병원명_날짜_시방서.json 형식으로 전체 데이터 다운로드
 * Returns the generated filename.
 */
export function exportForHeadquarters(project: Project): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const dealerName = project.salesProfile.dealerName || '대리점';
  const hospitalName = project.hospitalProfile.hospitalName || '병원';
  const filename = `${dateStr}_${dealerName}_${hospitalName}_시방서.json`;
  const data = serializeProjectState(project);
  const dataStr = JSON.stringify(data, null, 2);
  downloadStringAsFile(dataStr, filename, 'application/json');
  return filename;
}

/** Utility to trigger download */
function downloadStringAsFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

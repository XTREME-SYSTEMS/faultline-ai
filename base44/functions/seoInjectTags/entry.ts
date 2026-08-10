import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { encodeBase64, decodeBase64, generateGtagSnippet } from '../../shared/seoUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { seo_project_id, github_repo_url, site_url, generated_tags, ga_measurement_id } = body;

    if (!github_repo_url) return Response.json({ error: 'github_repo_url required' }, { status: 400 });

    const match = github_repo_url.match(/github\.com\/([^/]+)\/([^/\s]+)/);
    if (!match) return Response.json({ error: 'Invalid GitHub URL' }, { status: 400 });
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    const token = secrets.get('GITHUB_TOKEN');
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // Get current index.html
    const getFileResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/contents/index.html`, { headers });
    if (!getFileResponse.ok) {
      return Response.json({ error: `Failed to get index.html: ${getFileResponse.status}` }, { status: 500 });
    }

    const fileData = await getFileResponse.json();
    const sha = fileData.sha;
    let htmlContent = decodeBase64(fileData.content);

    // Build tags to inject
    const tagsToInject: string[] = [];
    if (generated_tags?.metaTagsHtml) tagsToInject.push(generated_tags.metaTagsHtml);
    if (ga_measurement_id) tagsToInject.push(generateGtagSnippet(ga_measurement_id));

    const tagsBlock = tagsToInject.join('\n');

    // Check if tags already injected
    if (htmlContent.includes('<!-- SEO_INJECTED -->')) {
      htmlContent = htmlContent.replace(
        /<!-- SEO_INJECTED -->[\s\S]*?<!-- END_SEO_INJECTED -->/,
        `<!-- SEO_INJECTED -->\n${tagsBlock}\n<!-- END_SEO_INJECTED -->`
      );
    } else if (htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', `<head>\n<!-- SEO_INJECTED -->\n${tagsBlock}\n<!-- END_SEO_INJECTED -->`);
    } else if (htmlContent.includes('<head ')) {
      htmlContent = htmlContent.replace(/<head [^>]*>/, (m: string) => `${m}\n<!-- SEO_INJECTED -->\n${tagsBlock}\n<!-- END_SEO_INJECTED -->`);
    } else {
      htmlContent = `<!DOCTYPE html><html><head><!-- SEO_INJECTED -->\n${tagsBlock}\n<!-- END_SEO_INJECTED --></head><body>${htmlContent}</body></html>`;
    }

    // Update index.html
    const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/contents/index.html`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'feat: inject SEO tags, schema, and GA tracking',
        content: encodeBase64(htmlContent),
        sha,
      }),
    });

    if (!updateResponse.ok) {
      const errData = await updateResponse.json().catch(() => ({}));
      return Response.json({ error: `Failed to update index.html: ${errData.message || updateResponse.status}` }, { status: 500 });
    }

    // Create/update sitemap.xml and robots.txt in public/
    if (generated_tags?.sitemap) {
      await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/contents/public/sitemap.xml`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: 'feat: add sitemap.xml for SEO',
          content: encodeBase64(generated_tags.sitemap),
        }),
      }).catch(() => {});
    }

    if (generated_tags?.robotsTxt) {
      await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/contents/public/robots.txt`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: 'feat: add robots.txt for SEO',
          content: encodeBase64(generated_tags.robotsTxt),
        }),
      }).catch(() => {});
    }

    if (seo_project_id) {
      await base44.asServiceRole.entities.SEOProject.update(seo_project_id, {
        tags_injected: true,
        status: 'submitting',
      });
    }

    return Response.json({
      success: true,
      message: 'SEO tags injected and committed to GitHub. Vercel will auto-redeploy.',
      repo: `${owner}/${cleanRepo}`,
    });
  } catch (error) {
    console.error('seoInjectTags error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
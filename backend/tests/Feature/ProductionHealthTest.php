<?php

namespace Tests\Feature;

use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\DB;
use Illuminate\View\Compilers\BladeCompiler;
use Tests\TestCase;

class ProductionHealthTest extends TestCase
{
    public function test_render_health_endpoint_is_static_and_database_free(): void
    {
        $queries = [];
        DB::listen(function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });

        $this->get('/up')
            ->assertOk()
            ->assertSeeText('OK');

        $this->assertSame([], $queries);
    }

    public function test_blade_can_write_to_the_configured_compiled_view_directory(): void
    {
        $files = app(Filesystem::class);
        $compiler = app(BladeCompiler::class);
        $template = storage_path('framework/testing/render-health.blade.php');
        $compiled = $compiler->getCompiledPath($template);

        $files->ensureDirectoryExists(dirname($template));
        $files->put($template, 'blade-write-ok');

        try {
            $this->assertSame('blade-write-ok', trim(view()->file($template)->render()));
            $this->assertFileExists($compiled);
        } finally {
            $files->delete([$template, $compiled]);
        }
    }
}

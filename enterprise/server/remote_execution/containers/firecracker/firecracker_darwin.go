//go:build darwin && !ios
// +build darwin,!ios

package firecracker

import (
	"context"

	"github.com/buildbuddy-io/buildbuddy/enterprise/server/remote_execution/container"
	"github.com/buildbuddy-io/buildbuddy/server/environment"
	"github.com/buildbuddy-io/buildbuddy/server/interfaces"
	"github.com/buildbuddy-io/buildbuddy/server/util/status"

	repb "github.com/buildbuddy-io/buildbuddy/proto/remote_execution"
	vmfspb "github.com/buildbuddy-io/buildbuddy/proto/vmvfs"
)

type FirecrackerContainer struct{}

func NewContainer(env environment.Env, imageCacheAuth *container.ImageCacheAuthenticator, opts ContainerOpts) (*FirecrackerContainer, error) {
	c := &FirecrackerContainer{}
	return c, nil
}

func (c *FirecrackerContainer) Run(ctx context.Context, command *repb.Command, actionWorkingDir string, creds container.PullCredentials) *interfaces.CommandResult {
	return &interfaces.CommandResult{}
}

func (c *FirecrackerContainer) Create(ctx context.Context, actionWorkingDir string) error {
	return status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) Exec(ctx context.Context, cmd *repb.Command, stdio *container.Stdio) *interfaces.CommandResult {
	return &interfaces.CommandResult{}
}

func (c *FirecrackerContainer) IsImageCached(ctx context.Context) (bool, error) {
	return false, status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) PullImage(ctx context.Context, creds container.PullCredentials) error {
	return status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) Remove(ctx context.Context) error {
	return status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) Pause(ctx context.Context) error {
	return status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) Unpause(ctx context.Context) error {
	return status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) Wait(ctx context.Context) error {
	return status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) Stats(ctx context.Context) (*repb.UsageStats, error) {
	return nil, status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) SetTaskFileSystemLayout(fsLayout *container.FileSystemLayout) {
}

func (c *FirecrackerContainer) LoadSnapshot(ctx context.Context, workspaceDirOverride string, instanceName string, snapshotDigest *repb.Digest) error {
	return status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) SaveSnapshot(ctx context.Context, instanceName string, d *repb.Digest, baseSnapshotDigest *repb.Digest) (*repb.Digest, error) {
	return nil, status.UnimplementedError("Not yet implemented.")
}

func (c *FirecrackerContainer) SendPrepareFileSystemRequestToGuest(ctx context.Context, req *vmfspb.PrepareRequest) (*vmfspb.PrepareResponse, error) {
	return nil, status.UnimplementedError("Not yet implemented.")
}
